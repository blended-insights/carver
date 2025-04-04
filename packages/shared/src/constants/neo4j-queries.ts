/**
 * Neo4j query templates for database operations
 * Extracted from neo4j.service.ts to improve maintainability
 */

// Constraints and Indexes
export const CONSTRAINTS_AND_INDEXES = {
  FILE_PATH_CONSTRAINT: "CREATE CONSTRAINT file_path IF NOT EXISTS FOR (f:File) REQUIRE f.path IS UNIQUE",
  DIRECTORY_PATH_CONSTRAINT: "CREATE CONSTRAINT directory_path IF NOT EXISTS FOR (d:Directory) REQUIRE d.path IS UNIQUE",
  PROJECT_NAME_CONSTRAINT: "CREATE CONSTRAINT project_name IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE",
  VERSION_NAME_CONSTRAINT: "CREATE CONSTRAINT version_name IF NOT EXISTS FOR (v:Version) REQUIRE v.name IS UNIQUE",
  FUNCTION_INDEX: "CREATE INDEX function_index IF NOT EXISTS FOR (f:Function) ON (f.name, f.filePath)",
  CLASS_INDEX: "CREATE INDEX class_index IF NOT EXISTS FOR (c:Class) ON (c.name, c.filePath)"
};

// Project Operations
export const PROJECT_QUERIES = {
  CREATE_OR_GET_PROJECT: `
    MERGE (p:Project {name: $name})
    ON CREATE SET p.rootPath = $rootPath, p.createdAt = datetime()
    ON MATCH SET p.rootPath = $rootPath, p.updatedAt = datetime()
    RETURN p
  `,
  CREATE_VERSION: `
    CREATE (v:Version {name: $versionName, timestamp: datetime()})
    WITH v
    MATCH (p:Project {name: $projectName})
    MERGE (p)-[:HAS_VERSION]->(v)
  `,
  GET_LATEST_VERSION: `
    MATCH (p:Project {name: $projectName})-[:HAS_VERSION]->(v:Version)
    RETURN v.name AS versionName
    ORDER BY v.timestamp DESC
    LIMIT 1
  `
};

// File Operations
export const FILE_QUERIES = {
  MARK_FILE_AS_DELETED: `
    MATCH (f:File {path: $filePath})
    MATCH (v:Version {name: $versionName})
    MERGE (f)-[:DELETED_IN]->(v)
  `,
  CREATE_FILE_VERSION_RELATIONSHIP: `
    MATCH (f:File {path: $filePath})
    MATCH (v:Version {name: $versionName})
    MERGE (f)-[:APPEARED_IN]->(v)
  `,
  CREATE_FILE_NODE: `
    MERGE (f:File {path: $path})
    SET f.name = $name,
        f.extension = $extension
    WITH f
    MATCH (d:Directory {path: $dirPath})
    MATCH (p:Project {name: $projectName})
    MERGE (p)-[:CONTAINS]->(d)
    MERGE (d)-[:CONTAINS]->(f)
  `,
  GET_ALL_FILES: `
    MATCH (f:File)
    RETURN f.path AS path, f.name AS name, f.extension AS extension
  `
};

// Directory Operations
export const DIRECTORY_QUERIES = {
  CREATE_DIRECTORY_NODE: `
    MERGE (d:Directory {path: $path})
    SET d.name = $name
    WITH d
    MATCH (p:Project {name: $projectName})
    MERGE (p)-[:CONTAINS]->(d)
  `,
  CREATE_DIRECTORY_RELATIONSHIP: `
    MATCH (parent:Directory {path: $parentPath})
    MATCH (child:Directory {path: $childPath})
    MERGE (parent)-[:CONTAINS]->(child)
  `
};

// Entity Operations
export const ENTITY_QUERIES = {
  LINK_ENTITY_TO_VERSION: `
    MATCH (entity:$ENTITY_TYPE {name: $name, filePath: $filePath})
    MATCH (v:Version {name: $versionName})
    MERGE (entity)-[:APPEARED_IN]->(v)
  `,
  CREATE_FUNCTION_NODE: `
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
  CREATE_CLASS_NODE: `
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
  CREATE_VARIABLE_NODE: `
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
  CREATE_IMPORT_NODE: `
    MATCH (f:File {path: $filePath})
    MERGE (i:Import {source: $source, filePath: $filePath})
    ON CREATE SET i.line = $line,
                  i.createdAt = datetime()
    ON MATCH SET i.line = $line,
                i.updatedAt = datetime()
    MERGE (f)-[:IMPORTS]->(i)
  `,
  CREATE_EXPORT_NODE: `
    MATCH (f:File {path: $filePath})
    MERGE (e:Export {name: $name, filePath: $filePath})
    ON CREATE SET e.line = $line,
                  e.isDefault = $isDefault,
                  e.createdAt = datetime()
    ON MATCH SET e.line = $line,
                e.isDefault = $isDefault,
                e.updatedAt = datetime()
    MERGE (f)-[:EXPORTS]->(e)
  `
};

// Entity Deletion and Movement
export const ENTITY_DELETION_QUERIES = {
  GET_PREVIOUS_FUNCTIONS: `
    MATCH (f:File {path: $filePath})-[:DEFINES]->(func:Function)
    WHERE NOT EXISTS { MATCH (func)-[:DELETED_IN]->() }
    RETURN func.name as name
  `,
  MARK_FUNCTION_DELETED: `
    MATCH (f:File {path: $filePath})-[:DEFINES]->(func:Function {name: $funcName})
    MATCH (v:Version {name: $versionName})
    MERGE (func)-[:DELETED_IN]->(v)
  `,
  GET_PREVIOUS_CLASSES: `
    MATCH (f:File {path: $filePath})-[:DEFINES]->(cls:Class)
    WHERE NOT EXISTS { MATCH (cls)-[:DELETED_IN]->() }
    RETURN cls.name as name
  `,
  MARK_CLASS_DELETED: `
    MATCH (f:File {path: $filePath})-[:DEFINES]->(cls:Class {name: $className})
    MATCH (v:Version {name: $versionName})
    MERGE (cls)-[:DELETED_IN]->(v)
  `,
  CHECK_FILE_EXISTS: "MATCH (f:File {path: $filePath}) RETURN f"
};

// Entity Movement
export const ENTITY_MOVEMENT_QUERIES = {
  FIND_MOVED_FUNCTION: `
    MATCH (oldFile:File)-[:DEFINES]->(func:Function {name: $funcName})
    MATCH (func)-[:DELETED_IN]->(v:Version)
    WHERE oldFile.path <> $filePath
    AND func.parameters = $parameters
    AND v.timestamp > datetime() - duration('P30D') // Within last 30 days
    RETURN oldFile.path as oldPath, func, v.timestamp as deletedAt
    ORDER BY deletedAt DESC
    LIMIT 1
  `,
  MARK_FUNCTION_MOVED: `
    MATCH (func:Function) WHERE id(func) = $funcId
    MATCH (newFile:File {path: $newPath})
    MATCH (v:Version {name: $versionName})
    MERGE (func)-[:MOVED_TO {in: $versionName}]->(newFile)
    MERGE (func)-[:APPEARED_IN]->(v)
    REMOVE (func)-[:DELETED_IN]->(v)
  `,
  FIND_MOVED_CLASS: `
    MATCH (oldFile:File)-[:DEFINES]->(cls:Class {name: $className})
    MATCH (cls)-[:DELETED_IN]->(v:Version)
    WHERE oldFile.path <> $filePath
    AND v.timestamp > datetime() - duration('P30D') // Within last 30 days
    RETURN oldFile.path as oldPath, cls, v.timestamp as deletedAt
    ORDER BY deletedAt DESC
    LIMIT 1
  `,
  MARK_CLASS_MOVED: `
    MATCH (cls:Class) WHERE id(cls) = $clsId
    MATCH (newFile:File {path: $newPath})
    MATCH (v:Version {name: $versionName})
    MERGE (cls)-[:MOVED_TO {in: $versionName}]->(newFile)
    MERGE (cls)-[:APPEARED_IN]->(v)
    REMOVE (cls)-[:DELETED_IN]->(v)
  `
};

// Function Calls
export const FUNCTION_CALL_QUERIES = {
  CREATE_FUNCTION_CALL_RELATIONSHIP: `
    MATCH (caller:Function {name: $callerName, filePath: $filePath})
    MATCH (callee:Function {name: $calleeName})
    MERGE (caller)-[:CALLS]->(callee)
  `
};
