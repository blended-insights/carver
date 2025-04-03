// Next.js API route handler
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { Redis } from 'ioredis';
import * as neo4j from 'neo4j-driver';
import crypto from 'crypto';

// Import graph-seeder modules
import {
  processDirectory,
  type FileNode,
  type FunctionNode,
  type ClassNode,
} from '@/lib/graph-seeder';

import {
  createTsMorphProject,
  getSourceFile,
  extractFunctions,
  extractClasses,
  extractVariables,
  extractImports,
  extractExports,
  analyzeFunctionCalls,
} from '@/lib/graph-seeder/ts-morph-extractors';

import {
  createFunctionNode,
  createClassNode,
  createVariableNode,
  createImportNode,
  createExportNode,
  createFunctionCallRelationships,
} from '@/lib/graph-seeder/node-creators';

import logger from '@/utils/logger';

// Load environment variables
dotenv.config();

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Create Neo4j driver
const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
);

/**
 * Calculate a hash for file content
 */
function calculateHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Get all files recursively from disk
 */
function getAllFilesFromDisk(rootPath: string): { relativePath: string; content: string }[] {
  const result: { relativePath: string; content: string }[] = [];

  function scanDir(dirPath: string) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (
            !entry.name.startsWith(".") &&
            entry.name !== "node_modules" &&
            entry.name !== "coverage" &&
            entry.name !== "dist" &&
            entry.name !== "docs" &&
            entry.name !== "logs"
          ) {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          try {
            if (
              entry.name === ".DS_Store" ||
              entry.name.startsWith(".env") ||
              entry.name.endsWith(".log") ||
              entry.name.endsWith(".pem") ||
              entry.name.endsWith(".tsbuildinfo")
            )
              continue;
            const content = fs.readFileSync(fullPath, "utf-8");
            const relativePath = path.relative(rootPath, fullPath);
            result.push({ relativePath, content });
          } catch (error) {
            logger.warn(`Could not read file: ${fullPath}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  scanDir(rootPath);
  return result;
}

/**
 * Convert file from disk to FileNode format
 */
function convertToFileNode(file: { relativePath: string; content: string }): FileNode {
  return {
    path: file.relativePath,
    name: path.basename(file.relativePath),
    extension: path.extname(file.relativePath),
    content: file.content,
  };
}

/**
 * Handle entities that were deleted from a file
 */
async function handleDeletedEntities(
  session: neo4j.Session,
  filePath: string,
  currentFunctions: FunctionNode[],
  currentClasses: ClassNode[],
  versionName: string,
): Promise<void> {
  // Check if file already exists in database
  const fileExists = await session.run("MATCH (f:File {path: $filePath}) RETURN f", { filePath });

  if (fileExists.records.length === 0) {
    // New file, no deletions to handle
    return;
  }

  // Handle deleted functions
  const previousFunctions = await session.run(
    `
    MATCH (f:File {path: $filePath})-[:DEFINES]->(func:Function)
    WHERE NOT EXISTS { MATCH (func)-[:DELETED_IN]->() }
    RETURN func.name as name
    `,
    { filePath },
  );

  const previousFunctionNames = previousFunctions.records.map((r) => r.get("name"));
  const currentFunctionNames = currentFunctions.map((f) => f.name);

  const deletedFunctions = previousFunctionNames.filter(
    (name) => !currentFunctionNames.includes(name),
  );

  for (const funcName of deletedFunctions) {
    logger.debug(`Marking function as deleted: ${funcName} in ${filePath}`);

    await session.run(
      `
      MATCH (f:File {path: $filePath})-[:DEFINES]->(func:Function {name: $funcName})
      MATCH (v:Version {name: $versionName})
      MERGE (func)-[:DELETED_IN]->(v)
      `,
      { filePath, funcName, versionName },
    );
  }

  // Handle deleted classes
  const previousClasses = await session.run(
    `
    MATCH (f:File {path: $filePath})-[:DEFINES]->(cls:Class)
    WHERE NOT EXISTS { MATCH (cls)-[:DELETED_IN]->() }
    RETURN cls.name as name
    `,
    { filePath },
  );

  const previousClassNames = previousClasses.records.map((r) => r.get("name"));
  const currentClassNames = currentClasses.map((c) => c.name);

  const deletedClasses = previousClassNames.filter((name) => !currentClassNames.includes(name));

  for (const className of deletedClasses) {
    logger.debug(`Marking class as deleted: ${className} in ${filePath}`);

    await session.run(
      `
      MATCH (f:File {path: $filePath})-[:DEFINES]->(cls:Class {name: $className})
      MATCH (v:Version {name: $versionName})
      MERGE (cls)-[:DELETED_IN]->(v)
      `,
      { filePath, className, versionName },
    );
  }
}

/**
 * Process entities that may have moved from other files
 */
async function processEntityMovements(
  session: neo4j.Session,
  filePath: string,
  functions: FunctionNode[],
  classes: ClassNode[],
  versionName: string,
): Promise<void> {
  // Check for potentially moved functions
  for (const func of functions) {
    // Look for deleted functions with same name and parameters from other files
    const potentialMoves = await session.run(
      `
      MATCH (oldFile:File)-[:DEFINES]->(func:Function {name: $funcName})
      MATCH (func)-[:DELETED_IN]->(v:Version)
      WHERE oldFile.path <> $filePath
      AND func.parameters = $parameters
      AND v.timestamp > datetime() - duration('P30D') // Within last 30 days
      RETURN oldFile.path as oldPath, func, v.timestamp as deletedAt
      ORDER BY deletedAt DESC
      LIMIT 1
      `,
      {
        funcName: func.name,
        filePath: filePath,
        parameters: func.parameters,
      },
    );

    if (potentialMoves.records.length > 0) {
      const oldPath = potentialMoves.records[0].get("oldPath");
      const funcNode = potentialMoves.records[0].get("func");

      logger.info(`Detected function movement: ${func.name} from ${oldPath} to ${filePath}`);

      // Mark as moved
      await session.run(
        `
        MATCH (func:Function) WHERE id(func) = $funcId
        MATCH (newFile:File {path: $newPath})
        MATCH (v:Version {name: $versionName})
        MERGE (func)-[:MOVED_TO {in: $versionName}]->(newFile)
        MERGE (func)-[:APPEARED_IN]->(v)
        REMOVE (func)-[:DELETED_IN]->(v)
        `,
        {
          funcId: funcNode.identity,
          newPath: filePath,
          versionName,
        },
      );
    }
  }

  // Check for potentially moved classes
  for (const cls of classes) {
    // Look for deleted classes with same name from other files
    const potentialMoves = await session.run(
      `
      MATCH (oldFile:File)-[:DEFINES]->(cls:Class {name: $className})
      MATCH (cls)-[:DELETED_IN]->(v:Version)
      WHERE oldFile.path <> $filePath
      AND v.timestamp > datetime() - duration('P30D') // Within last 30 days
      RETURN oldFile.path as oldPath, cls, v.timestamp as deletedAt
      ORDER BY deletedAt DESC
      LIMIT 1
      `,
      {
        className: cls.name,
        filePath: filePath,
      },
    );

    if (potentialMoves.records.length > 0) {
      const oldPath = potentialMoves.records[0].get("oldPath");
      const clsNode = potentialMoves.records[0].get("cls");

      logger.info(`Detected class movement: ${cls.name} from ${oldPath} to ${filePath}`);

      // Mark as moved
      await session.run(
        `
        MATCH (cls:Class) WHERE id(cls) = $clsId
        MATCH (newFile:File {path: $newPath})
        MATCH (v:Version {name: $versionName})
        MERGE (cls)-[:MOVED_TO {in: $versionName}]->(newFile)
        MERGE (cls)-[:APPEARED_IN]->(v)
        REMOVE (cls)-[:DELETED_IN]->(v)
        `,
        {
          clsId: clsNode.identity,
          newPath: filePath,
          versionName,
        },
      );
    }
  }
}

/**
 * Seeds the Neo4j database with version-tracked code entities using ts-morph and Redis
 */
async function seedGraph(options: { root: string; project: string }): Promise<{ success: boolean, message: string }> {
  // Destructure options
  const { root, project } = options;

  // Validate inputs
  if (!root || !project) {
    return { 
      success: false, 
      message: "Missing required parameters: root path and project name" 
    };
  }

  // Resolve the root path
  const rootPath = path.resolve(root);
  const projectName = project;
  const versionName = `v_${Date.now()}`;
  
  // Validate that the directory exists
  if (!fs.existsSync(rootPath)) {
    return { 
      success: false, 
      message: `Directory does not exist: ${rootPath}` 
    };
  }

  const session = driver.session();
  try {
    // Create unique constraints and indexes if they don't exist
    await session.run(
      "CREATE CONSTRAINT file_path IF NOT EXISTS FOR (f:File) REQUIRE f.path IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT directory_path IF NOT EXISTS FOR (d:Directory) REQUIRE d.path IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT project_name IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT version_name IF NOT EXISTS FOR (v:Version) REQUIRE v.name IS UNIQUE",
    );
    await session.run(
      "CREATE INDEX function_index IF NOT EXISTS FOR (f:Function) ON (f.name, f.filePath)",
    );
    await session.run(
      "CREATE INDEX class_index IF NOT EXISTS FOR (c:Class) ON (c.name, c.filePath)",
    );

    logger.info("Created constraints and indexes");

    // Create or get Project node
    await session.run(
      `
      MERGE (p:Project {name: $name})
      ON CREATE SET p.rootPath = $rootPath, p.createdAt = datetime()
      ON MATCH SET p.rootPath = $rootPath, p.updatedAt = datetime()
      RETURN p
      `,
      { name: projectName, rootPath: rootPath },
    );

    // Create new Version node
    await session.run(
      `
      CREATE (v:Version {name: $versionName, timestamp: datetime()})
      WITH v
      MATCH (p:Project {name: $projectName})
      MERGE (p)-[:HAS_VERSION]->(v)
      `,
      { versionName, projectName },
    );

    // Process the file structure (directories and files)
    await processDirectory(session, rootPath, rootPath, projectName);

    // Get all files from disk
    const filesFromDisk = getAllFilesFromDisk(rootPath);
    logger.info(`Found ${filesFromDisk.length} files on disk`);

    // Get all existing file keys from Redis for this project
    const redisFileKeys = await redis.keys(`project:${projectName}:file:*`);
    const diskFilePaths = filesFromDisk.map((f) => `project:${projectName}:file:${f.relativePath}`);

    // Find deleted files (in Redis but not on disk)
    const deletedFilePaths = redisFileKeys.filter((key) => !diskFilePaths.includes(key));

    // Process deleted files
    for (const deletedFilePath of deletedFilePaths) {
      const filePath = deletedFilePath.replace(`project:${projectName}:file:`, "");
      logger.info(`Marking file as deleted: ${filePath}`);

      // Mark file as deleted in current version
      await session.run(
        `
        MATCH (f:File {path: $filePath})
        MATCH (v:Version {name: $versionName})
        MERGE (f)-[:DELETED_IN]->(v)
        `,
        { filePath, versionName },
      );

      // Remove from Redis
      await redis.del(deletedFilePath);
    }

    // Process files to find changes
    const newOrChangedFiles: FileNode[] = [];
    const unchangedFiles: string[] = [];

    for (const file of filesFromDisk) {
      const fileKey = `project:${projectName}:file:${file.relativePath}`;
      const currentHash = calculateHash(file.content);

      // Get stored hash from Redis
      const storedHash = await redis.hget(fileKey, "hash");

      if (!storedHash || storedHash !== currentHash) {
        // File is new or changed
        newOrChangedFiles.push(convertToFileNode(file));

        // Update Redis
        await redis.hset(fileKey, {
          content: file.content,
          hash: currentHash,
          lastModified: Date.now().toString(),
        });
      } else {
        // File is unchanged
        unchangedFiles.push(file.relativePath);
      }
    }

    logger.info(`Found ${newOrChangedFiles.length} new or changed files`);
    logger.info(`Found ${unchangedFiles.length} unchanged files`);

    // Filter for TypeScript/JavaScript files
    const tsJsFiles = newOrChangedFiles.filter((file) =>
      [".ts", ".tsx", ".js", ".jsx"].includes(file.extension),
    );

    // Skip files that are too large
    const filteredFiles = tsJsFiles.filter((file) => {
      if (file.content.length > 1024 * 1024) {
        logger.warn(`Skipping large file: ${file.path}`);
        return false;
      }
      return true;
    });

    logger.info(`Processing ${filteredFiles.length} TypeScript/JavaScript files with ts-morph`);

    // Process changed/new files with ts-morph
    if (filteredFiles.length > 0) {
      // Initialize ts-morph project
      const project = createTsMorphProject(filteredFiles);

      // Process each file
      for (const file of filteredFiles) {
        try {
          const sourceFile = getSourceFile(project, file);
          if (!sourceFile) {
            logger.warn(`Could not get source file for ${file.path}`);
            continue;
          }

          // Extract entities using ts-morph
          const functions = extractFunctions(file, sourceFile);
          const classes = extractClasses(file, sourceFile);
          const variables = extractVariables(file, sourceFile);
          const imports = extractImports(file, sourceFile);
          const exports = extractExports(file, sourceFile);

          // First, handle deleted entities in the file (if the file already existed)
          await handleDeletedEntities(session, file.path, functions, classes, versionName);

          // Process entity movements (if they come from other files)
          await processEntityMovements(session, file.path, functions, classes, versionName);

          // Create file's relationship to current version
          await session.run(
            `
            MATCH (f:File {path: $filePath})
            MATCH (v:Version {name: $versionName})
            MERGE (f)-[:APPEARED_IN]->(v)
            `,
            { filePath: file.path, versionName },
          );

          // Create entities in Neo4j
          for (const func of functions) {
            await createFunctionNode(session, func);

            // Link function to current version
            await session.run(
              `
              MATCH (func:Function {name: $name, filePath: $filePath})
              MATCH (v:Version {name: $versionName})
              MERGE (func)-[:APPEARED_IN]->(v)
              `,
              {
                name: func.name,
                filePath: func.filePath,
                versionName,
              },
            );
          }

          for (const cls of classes) {
            await createClassNode(session, cls);

            // Link class to current version
            await session.run(
              `
              MATCH (cls:Class {name: $name, filePath: $filePath})
              MATCH (v:Version {name: $versionName})
              MERGE (cls)-[:APPEARED_IN]->(v)
              `,
              {
                name: cls.name,
                filePath: cls.filePath,
                versionName,
              },
            );
          }

          for (const variable of variables) {
            await createVariableNode(session, variable);

            // Link variable to current version
            await session.run(
              `
              MATCH (var:Variable {name: $name, filePath: $filePath})
              MATCH (v:Version {name: $versionName})
              MERGE (var)-[:APPEARED_IN]->(v)
              `,
              {
                name: variable.name,
                filePath: variable.filePath,
                versionName,
              },
            );
          }

          for (const importNode of imports) {
            await createImportNode(session, importNode);
          }

          for (const exportNode of exports) {
            await createExportNode(session, exportNode);
          }

          // Process function calls
          const functionCalls = analyzeFunctionCalls(functions, sourceFile);
          if (functionCalls.length > 0) {
            await createFunctionCallRelationships(session, file.path, functionCalls);
          }

          logger.debug(`Processed file: ${file.path}`);
        } catch (error) {
          logger.error(`Error processing file ${file.path}:`, error);
        }
      }
    }

    logger.info(
      `Successfully seeded the graph database for project: ${projectName} with version: ${versionName}`,
    );
    
    return {
      success: true,
      message: `Successfully seeded the graph database for project: ${projectName} with version: ${versionName}. Processed ${filesFromDisk.length} files (${newOrChangedFiles.length} changed, ${filteredFiles.length} analyzed)`
    };
  } catch (error) {
    logger.error("Error seeding graph database:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  } finally {
    await session.close();
  }
}

// API routes
export async function GET(request: NextRequest) {
  // Extract query parameters
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  const project = searchParams.get('project');
  
  if (!path || !project) {
    return NextResponse.json({ 
      success: false,
      message: "Missing required parameters: path and project" 
    }, { status: 400 });
  }
  
  try {
    const result = await seedGraph({root: path, project});
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    logger.error("Error in API route:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Server error: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract body parameters
    const body = await request.json();
    const { path, project } = body;
    
    if (!path || !project) {
      return NextResponse.json({ 
        success: false,
        message: "Missing required parameters in request body: path and project" 
      }, { status: 400 });
    }
    
    const result = await seedGraph({root: path, project});
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    logger.error("Error in API route:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Server error: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
