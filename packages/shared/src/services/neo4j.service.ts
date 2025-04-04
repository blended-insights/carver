import * as neo4j from 'neo4j-driver';
import { 
  INeo4jService, 
  FunctionNode, 
  ClassNode, 
  VariableNode, 
  ImportNode, 
  ExportNode 
} from '../interfaces/services.interface';
import logger from 'src/utils/logger';

/**
 * Service to handle all Neo4j database operations
 */
export class Neo4jService implements INeo4jService {
  private driver: neo4j.Driver;
  
  constructor() {
    // Create Neo4j driver
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || (() => { throw new Error("NEO4J_URI is not defined in the environment variables"); })(),
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || (() => { throw new Error("NEO4J_USERNAME is not defined in the environment variables"); })(),
        process.env.NEO4J_PASSWORD || (() => { throw new Error("NEO4J_PASSWORD is not defined in the environment variables"); })(),
      ),
    );
  }
  
  /**
   * Get a new Neo4j session
   */
  getSession(): neo4j.Session {
    return this.driver.session();
  }
  
  /**
   * Close the Neo4j driver
   */
  async close(): Promise<void> {
    await this.driver.close();
  }
  
  /**
   * Execute a Neo4j query in a managed session
   * @param callback Function that takes a session and returns a promise
   */
  private async executeInSession<T>(callback: (session: neo4j.Session) => Promise<T>): Promise<T> {
    const session = this.getSession();
    try {
      return await callback(session);
    } finally {
      await session.close();
    }
  }
  
  /**
   * Create constraints and indexes for Neo4j database
   */
  async createConstraintsAndIndexes(): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
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
      } catch (error) {
        logger.error("Error creating constraints and indexes:", error);
        throw error;
      }
    });
  }
  
  /**
   * Create or get a project node
   * @param projectName Project name
   * @param rootPath Project root path
   */
  async createOrGetProject(
    projectName: string,
    rootPath: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MERGE (p:Project {name: $name})
          ON CREATE SET p.rootPath = $rootPath, p.createdAt = datetime()
          ON MATCH SET p.rootPath = $rootPath, p.updatedAt = datetime()
          RETURN p
          `,
          { name: projectName, rootPath: rootPath },
        );
      } catch (error) {
        logger.error(`Error creating or getting project ${projectName}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create a new version node
   * @param versionName Version name
   * @param projectName Project name
   */
  async createVersion(
    versionName: string,
    projectName: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          CREATE (v:Version {name: $versionName, timestamp: datetime()})
          WITH v
          MATCH (p:Project {name: $projectName})
          MERGE (p)-[:HAS_VERSION]->(v)
          `,
          { versionName, projectName },
        );
      } catch (error) {
        logger.error(`Error creating version ${versionName}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Mark a file as deleted in the current version
   * @param filePath File path
   * @param versionName Version name
   */
  async markFileAsDeleted(
    filePath: string,
    versionName: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (f:File {path: $filePath})
          MATCH (v:Version {name: $versionName})
          MERGE (f)-[:DELETED_IN]->(v)
          `,
          { filePath, versionName },
        );
      } catch (error) {
        logger.error(`Error marking file ${filePath} as deleted:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create file's relationship to current version
   * @param filePath File path
   * @param versionName Version name
   */
  async createFileVersionRelationship(
    filePath: string,
    versionName: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (f:File {path: $filePath})
          MATCH (v:Version {name: $versionName})
          MERGE (f)-[:APPEARED_IN]->(v)
          `,
          { filePath: filePath, versionName },
        );
      } catch (error) {
        logger.error(`Error creating file-version relationship for ${filePath}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Link a code entity to the current version
   * @param entityType Type of entity (Function, Class, Variable)
   * @param name Entity name
   * @param filePath File path
   * @param versionName Version name
   */
  async linkEntityToVersion(
    entityType: 'Function' | 'Class' | 'Variable',
    name: string,
    filePath: string,
    versionName: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (entity:${entityType} {name: $name, filePath: $filePath})
          MATCH (v:Version {name: $versionName})
          MERGE (entity)-[:APPEARED_IN]->(v)
          `,
          {
            name,
            filePath,
            versionName,
          },
        );
      } catch (error) {
        logger.error(`Error linking ${entityType} ${name} to version:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Handle entities that were deleted from a file
   * @param filePath File path
   * @param currentFunctions Current functions in the file
   * @param currentClasses Current classes in the file
   * @param versionName Version name
   */
  async handleDeletedEntities(
    filePath: string,
    currentFunctions: FunctionNode[],
    currentClasses: ClassNode[],
    versionName: string,
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        // Check if file already exists in database
        const fileExists = await session.run(
          "MATCH (f:File {path: $filePath}) RETURN f", 
          { filePath }
        );

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

        const deletedClasses = previousClassNames.filter(
          (name) => !currentClassNames.includes(name),
        );

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
      } catch (error) {
        logger.error(`Error handling deleted entities for ${filePath}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Process entities that may have moved from other files
   * @param filePath File path
   * @param functions Functions in the file
   * @param classes Classes in the file
   * @param versionName Version name
   */
  async processEntityMovements(
    filePath: string,
    functions: FunctionNode[],
    classes: ClassNode[],
    versionName: string,
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
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
      } catch (error) {
        logger.error(`Error processing entity movements for ${filePath}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create a function node in Neo4j
   * @param func Function node data
   */
  async createFunctionNode(func: FunctionNode): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (f:File {path: $filePath})
          MERGE (func:Function {name: $name, filePath: $filePath})
          ON CREATE SET func.lineStart = $lineStart,
                        func.lineEnd = $lineEnd,
                        func.parameters = $parameters,
                        func.createdAt = datetime()
          ON MATCH SET func.lineStart = $lineStart,
                      func.lineEnd = $lineEnd,
                      func.parameters = $parameters,
                      func.updatedAt = datetime()
          MERGE (f)-[:DEFINES]->(func)
          `,
          {
            name: func.name,
            filePath: func.filePath,
            lineStart: func.lineStart,
            lineEnd: func.lineEnd,
            parameters: func.parameters,
          },
        );
      } catch (error) {
        logger.error(`Error creating function node ${func.name}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create a class node in Neo4j
   * @param cls Class node data
   */
  async createClassNode(cls: ClassNode): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (f:File {path: $filePath})
          MERGE (cls:Class {name: $name, filePath: $filePath})
          ON CREATE SET cls.lineStart = $lineStart,
                        cls.lineEnd = $lineEnd,
                        cls.methods = $methods,
                        cls.properties = $properties,
                        cls.createdAt = datetime()
          ON MATCH SET cls.lineStart = $lineStart,
                      cls.lineEnd = $lineEnd,
                      cls.methods = $methods,
                      cls.properties = $properties,
                      cls.updatedAt = datetime()
          MERGE (f)-[:DEFINES]->(cls)
          `,
          {
            name: cls.name,
            filePath: cls.filePath,
            lineStart: cls.lineStart,
            lineEnd: cls.lineEnd,
            methods: cls.methods,
            properties: cls.properties,
          },
        );
      } catch (error) {
        logger.error(`Error creating class node ${cls.name}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create a variable node in Neo4j
   * @param variable Variable node data
   */
  async createVariableNode(variable: VariableNode): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (f:File {path: $filePath})
          MERGE (v:Variable {name: $name, filePath: $filePath})
          ON CREATE SET v.type = $type,
                        v.line = $line,
                        v.createdAt = datetime()
          ON MATCH SET v.type = $type,
                      v.line = $line,
                      v.updatedAt = datetime()
          MERGE (f)-[:DEFINES]->(v)
          `,
          {
            name: variable.name,
            filePath: variable.filePath,
            type: variable.type,
            line: variable.line,
          },
        );
      } catch (error) {
        logger.error(`Error creating variable node ${variable.name}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create an import node in Neo4j
   * @param importNode Import node data
   */
  async createImportNode(importNode: ImportNode): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (f:File {path: $filePath})
          MERGE (i:Import {source: $source, filePath: $filePath})
          ON CREATE SET i.line = $line,
                        i.createdAt = datetime()
          ON MATCH SET i.line = $line,
                      i.updatedAt = datetime()
          MERGE (f)-[:IMPORTS]->(i)
          `,
          {
            source: importNode.source,
            filePath: importNode.filePath,
            line: importNode.line,
          },
        );
      } catch (error) {
        logger.error(`Error creating import node ${importNode.source}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create an export node in Neo4j
   * @param exportNode Export node data
   */
  async createExportNode(exportNode: ExportNode): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (f:File {path: $filePath})
          MERGE (e:Export {name: $name, filePath: $filePath})
          ON CREATE SET e.line = $line,
                        e.isDefault = $isDefault,
                        e.createdAt = datetime()
          ON MATCH SET e.line = $line,
                      e.isDefault = $isDefault,
                      e.updatedAt = datetime()
          MERGE (f)-[:EXPORTS]->(e)
          `,
          {
            name: exportNode.name,
            filePath: exportNode.filePath,
            line: exportNode.line,
            isDefault: exportNode.isDefault,
          },
        );
      } catch (error) {
        logger.error(`Error creating export node ${exportNode.name}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Create function call relationships in Neo4j
   * @param filePath File path
   * @param functionCalls Function calls data
   */
  async createFunctionCallRelationships(
    filePath: string,
    functionCalls: { caller: string; callee: string }[]
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        // Create CALLS relationships
        for (const call of functionCalls) {
          await session.run(
            `
            MATCH (caller:Function {name: $callerName, filePath: $filePath})
            MATCH (callee:Function {name: $calleeName})
            MERGE (caller)-[:CALLS]->(callee)
            `,
            {
              callerName: call.caller,
              calleeName: call.callee,
              filePath,
            },
          );
        }
      } catch (error) {
        logger.error(`Error creating function call relationships in ${filePath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create a directory node in Neo4j
   * @param dirPath Directory path relative to project root
   * @param dirName Directory name
   * @param projectName Project name
   */
  async createDirectoryNode(
    dirPath: string,
    dirName: string,
    projectName: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MERGE (d:Directory {path: $path})
          SET d.name = $name
          WITH d
          MATCH (p:Project {name: $projectName})
          MERGE (p)-[:CONTAINS]->(d)
          `,
          { path: dirPath, name: dirName, projectName }
        );
      } catch (error) {
        logger.error(`Error creating directory node for ${dirPath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create a parent-child relationship between directories
   * @param parentPath Parent directory path
   * @param childPath Child directory path
   */
  async createDirectoryRelationship(
    parentPath: string,
    childPath: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
        await session.run(
          `
          MATCH (parent:Directory {path: $parentPath})
          MATCH (child:Directory {path: $childPath})
          MERGE (parent)-[:CONTAINS]->(child)
          `,
          { parentPath, childPath }
        );
      } catch (error) {
        logger.error(`Error creating directory relationship between ${parentPath} and ${childPath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create a file node in Neo4j
   * @param filePath File path relative to project root
   * @param fileName File name
   * @param fileExtension File extension
   * @param dirPath Directory path that contains the file
   * @param projectName Project name
   */
  async createFileNode(
    filePath: string,
    fileName: string,
    fileExtension: string,
    dirPath: string,
    projectName: string
  ): Promise<void> {
    return this.executeInSession(async (session) => {
      try {
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
            path: filePath,
            name: fileName,
            extension: fileExtension,
            dirPath,
            projectName,
          }
        );
      } catch (error) {
        logger.error(`Error creating file node for ${filePath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get the latest version name for a project
   * @param projectName Project name
   * @returns Latest version name or null if no version exists
   */
  async getLatestVersionName(
    projectName: string
  ): Promise<string | null> {
    return this.executeInSession(async (session) => {
      try {
        const result = await session.run(
          `
          MATCH (p:Project {name: $projectName})-[:HAS_VERSION]->(v:Version)
          RETURN v.name AS versionName
          ORDER BY v.timestamp DESC
          LIMIT 1
          `,
          { projectName }
        );
        
        if (result.records.length > 0) {
          return result.records[0].get("versionName");
        }
        
        return null;
      } catch (error) {
        logger.error(`Error getting latest version for project ${projectName}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get all files from Neo4j
   * @returns Array of file objects
   */
  async getAllFiles(): Promise<{ path: string; name: string; extension: string }[]> {
    return this.executeInSession(async (session) => {
      try {
        const result = await session.run(
          `
          MATCH (f:File)
          RETURN f.path AS path, f.name AS name, f.extension AS extension
          `
        );
        
        return result.records.map(record => ({
          path: record.get("path"),
          name: record.get("name"),
          extension: record.get("extension")
        }));
      } catch (error) {
        logger.error("Error getting all files:", error);
        throw error;
      }
    });
  }
}

// Export singleton instance
const neo4jService = new Neo4jService();
export default neo4jService;
