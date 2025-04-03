import fs from "fs";
import path from "path";
import * as neo4j from "neo4j-driver";
import logger from "@/utils/logger";
import type { FileNode } from "./types";

/**
 * Processes a directory to create File and Directory nodes
 * @param session - Neo4j session
 * @param dirPath - Current directory path
 * @param projectRoot - Project root directory
 * @param projectName - Name of the project
 */
export async function processDirectory(
  session: neo4j.Session,
  dirPath: string,
  projectRoot: string,
  projectName: string,
): Promise<void> {
  const relativePath = path.relative(projectRoot, dirPath);
  const dirName = path.basename(dirPath);

  // Skip node_modules, dist, and hidden directories
  if (dirPath.includes("node_modules") || dirPath.includes("dist") || dirName.startsWith(".")) {
    return;
  }

  // Create Directory node
  if (relativePath) {
    await session.run(
      `
      MERGE (d:Directory {path: $path})
      SET d.name = $name
      WITH d
      MATCH (p:Project {name: $projectName})
      MERGE (p)-[:CONTAINS]->(d)
      `,
      { path: relativePath, name: dirName, projectName },
    );

    // Create CONTAINS relationship with parent directory
    const parentPath = path.dirname(relativePath);
    if (parentPath !== ".") {
      await session.run(
        `
        MATCH (parent:Directory {path: $parentPath})
        MATCH (child:Directory {path: $childPath})
        MERGE (parent)-[:CONTAINS]->(child)
        `,
        { parentPath, childPath: relativePath },
      );
    }
  }

  // Process children
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      await processDirectory(session, entryPath, projectRoot, projectName);
    } else if (entry.isFile()) {
      // Create File node
      const fileName = entry.name;
      const fileExtension = path.extname(fileName);
      const fileRelativePath = path.relative(projectRoot, entryPath);

      await session.run(
        `
        MERGE (f:File {path: $path})
        SET f.name = $name,
            f.extension = $extension
        WITH f
        MATCH (d:Directory {path: $dirPath})
        MATCH (p:Project {name: $projectName})
        MERGE (p)-[:CONTAINS]->(d)
        MERGE (d)-[:CONTAINS]->(f)
        `,
        {
          path: fileRelativePath,
          name: fileName,
          extension: fileExtension,
          dirPath: path.dirname(fileRelativePath),
          projectName,
        },
      );
    }
  }
}

/**
 * Retrieves all File nodes from the database
 */
export async function getFiles(session: neo4j.Session, projectRoot: string): Promise<FileNode[]> {
  const result = await session.run(
    `
    MATCH (f:File)
    RETURN f.path AS path, f.name AS name, f.extension AS extension
    `,
  );

  return result.records.map((record) => {
    const filePath = record.get("path");
    const fullPath = path.join(projectRoot, filePath);
    let content = "";

    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch (error) {
      logger.warn(`Could not read file content for ${filePath}`);
    }

    return {
      path: filePath,
      name: record.get("name"),
      extension: record.get("extension"),
      content,
    };
  });
}
