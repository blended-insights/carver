/**
 * Neo4j query templates for database operations
 * Extracted from neo4j.service.ts to improve maintainability
 */

// Admin Operations
export const ADMIN_QUERIES = {
  CLEAR_DATABASE: 'MATCH (n) DETACH DELETE n',
};

// Constraints and Indexes
export const CONSTRAINTS_AND_INDEXES = {
  FILE_PATH_CONSTRAINT:
    'CREATE CONSTRAINT file_path IF NOT EXISTS FOR (f:File) REQUIRE f.path IS UNIQUE',
  DIRECTORY_PATH_CONSTRAINT:
    'CREATE CONSTRAINT directory_path IF NOT EXISTS FOR (d:Directory) REQUIRE d.path IS UNIQUE',
  PROJECT_NAME_CONSTRAINT:
    'CREATE CONSTRAINT project_name IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE',
  VERSION_NAME_CONSTRAINT:
    'CREATE CONSTRAINT version_name IF NOT EXISTS FOR (v:Version) REQUIRE v.name IS UNIQUE',
  FUNCTION_INDEX:
    'CREATE INDEX function_index IF NOT EXISTS FOR (f:Function) ON (f.name, f.filePath)',
  CLASS_INDEX:
    'CREATE INDEX class_index IF NOT EXISTS FOR (c:Class) ON (c.name, c.filePath)',
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
    MERGE (v:Version {name: $versionName})
    ON CREATE SET v.timestamp = datetime()
    WITH v
    MATCH (p:Project {name: $projectName})
    MERGE (p)-[:HAS_VERSION]->(v)
  `,
  GET_LATEST_VERSION: `
    MATCH (p:Project {name: $projectName})-[:HAS_VERSION]->(v:Version)
    RETURN v.name AS versionName
    ORDER BY v.timestamp DESC
    LIMIT 1
  `,
  GET_PROJECT_BY_NAME: `
    MATCH (p:Project {name: $projectName})
    OPTIONAL MATCH (p)-[:CONTAINS*1..]->(f:File)
    WITH p, count(distinct f) as fileCount
    OPTIONAL MATCH (p)-[:HAS_VERSION]->(v:Version)
    WITH p, fileCount, v
    ORDER BY v.timestamp DESC
    WITH p, fileCount, collect(v)[0] as latestVersion
    RETURN 
      p.name as id, 
      p.name as name, 
      p.rootPath as path, 
      fileCount,
      CASE WHEN latestVersion IS NULL 
        THEN NULL 
        ELSE toString(latestVersion.timestamp) 
      END as lastUpdated
  `,
  GET_ALL_PROJECTS: `
    MATCH (p:Project)
    OPTIONAL MATCH (p)-[:CONTAINS*1..]->(f:File)
    WITH p, count(distinct f) as fileCount
    OPTIONAL MATCH (p)-[:HAS_VERSION]->(v:Version)
    WITH p, fileCount, v
    ORDER BY v.timestamp DESC
    WITH p, fileCount, collect(v)[0] as latestVersion
    RETURN 
      p.name as id, 
      p.name as name, 
      p.rootPath as path, 
      fileCount,
      CASE WHEN latestVersion IS NULL 
        THEN NULL 
        ELSE toString(latestVersion.timestamp) 
      END as lastUpdated
    ORDER BY fileCount DESC
  `,
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
  `,
  GET_FILES_BY_PROJECT: `
    MATCH (p:Project {name: $projectName})-[:CONTAINS*1..]->(f:File)
    RETURN f.path AS path, f.name AS name, f.extension AS extension
  `,
  SEARCH_FILES_BY_PROJECT: `
    MATCH (p:Project {name: $projectName})-[:CONTAINS*1..]->(f:File)
    WHERE toLower(f.path) CONTAINS toLower($searchTerm)
    RETURN DISTINCT f.path AS path, f.name AS name, f.extension AS extension
  `,
  SEARCH_BY_FUNCTION: `
    MATCH (p:Project {name: $projectName})-[:CONTAINS*1..]->(f:File)-[:DEFINES]->(func:Function)
    WHERE toLower(func.name) CONTAINS toLower($searchTerm)
    RETURN DISTINCT f.path AS path, f.name AS name, f.extension AS extension
  `,
  SEARCH_BY_IMPORT: `
    MATCH (p:Project {name: $projectName})-[:CONTAINS*1..]->(f:File)-[:IMPORTS]->(i:Import)
    WHERE toLower(i.source) CONTAINS toLower($searchTerm)
    RETURN DISTINCT f.path AS path, f.name AS name, f.extension AS extension
  `,
  SEARCH_BY_DIRECTORY: `
    MATCH (p:Project {name: $projectName})-[:CONTAINS*1..]->(d:Directory)-[:CONTAINS]->(f:File)
    WHERE toLower(d.path) CONTAINS toLower($searchTerm) OR toLower(d.name) CONTAINS toLower($searchTerm)
    RETURN DISTINCT f.path AS path, f.name AS name, f.extension AS extension
  `,
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
  `,
  GET_DIRECTORIES_BY_PROJECT: `
    // Match the project and its directories
    MATCH (p:Project {name: $projectName})
    MATCH path = (p)-[:CONTAINS*1..]->(d:Directory)
    WHERE length(path) > 0
    RETURN DISTINCT d.path AS path, d.name AS name
    ORDER BY d.path
  `,
  SEARCH_DIRECTORIES_BY_PROJECT: `
    // Match the project and search for directories
    MATCH (p:Project {name: $projectName})
    MATCH path = (p)-[:CONTAINS*1..]->(d:Directory)
    WHERE length(path) > 0
      AND (toLower(d.path) CONTAINS toLower($searchTerm) OR toLower(d.name) CONTAINS toLower($searchTerm))
    RETURN DISTINCT d.path AS path, d.name AS name
    ORDER BY d.path
  `,
  GET_DIRECTORY_BY_PATH: `
    // Match the project and the specific directory
    MATCH (p:Project {name: $projectName})
    MATCH (d:Directory {path: $dirPath})
    // Make sure the directory is within the project's hierarchy
    MATCH path = shortestPath((p)-[:CONTAINS*]->(d))
    WHERE length(path) > 0
    RETURN d.path AS path, d.name AS name
  `,
  GET_FILES_BY_DIRECTORY: `
    MATCH (p:Project {name: $projectName})-[:CONTAINS*1..]->(d:Directory {path: $dirPath})-[:CONTAINS]->(f:File)
    RETURN f.path AS path, f.name AS name, 'file' AS type, f.extension AS extension
  `,
  GET_ITEMS_BY_DIRECTORY: `
    // Match the project and directory 
    MATCH (p:Project {name: $projectName})
    MATCH (dir:Directory {path: $dirPath})
    // Make sure the directory is within the project's hierarchy
    MATCH path = shortestPath((p)-[:CONTAINS*]->(dir))
    WHERE length(path) > 0
    // Get parent directory as a row
    WITH p, dir
    OPTIONAL MATCH (dir)-[:CONTAINS]->(child)
    WHERE child:Directory OR child:File
    RETURN 
      child.path AS path,
      child.name AS name,
      CASE
        WHEN child:Directory THEN 'directory'
        WHEN child:File THEN 'file'
        ELSE NULL
      END AS type,
      CASE 
        WHEN child:File THEN child.extension
        ELSE NULL
      END AS extension
    ORDER BY type, extension
  `,
  GET_ROOT_ITEMS_BY_PROJECT: `
    MATCH (p:Project {name: $projectName})-[:CONTAINS]->(item)
    RETURN 
      item.path AS path,
      item.name AS name,
      CASE 
        WHEN 'Directory' IN labels(item) THEN "directory"
        ELSE "file"
      END AS type,
      CASE 
        WHEN 'File' IN labels(item) THEN item.extension
        ELSE null
      END AS extension
    ORDER BY type DESC, name
  `,
  GET_DIRECTORY_TREE_BY_PATH: `
    // Match the project and directory
    MATCH (p:Project {name: $projectName})
    MATCH (dir:Directory {path: $dirPath})
    // Make sure the directory is within the project's hierarchy
    MATCH path = shortestPath((p)-[:CONTAINS*]->(dir))
    WHERE length(path) > 0

    // First, include the root directory itself
    WITH p, dir
    RETURN
      dir.path AS path,
      dir.name AS name,
      'directory' AS type,
      NULL AS extension
    
    // Then get all subdirectories (at any level)
    UNION
    
    MATCH (p:Project {name: $projectName})
    MATCH (dir:Directory {path: $dirPath})
    MATCH (dir)-[:CONTAINS*1..]->(subdir:Directory)
    RETURN
      subdir.path AS path,
      subdir.name AS name,
      'directory' AS type,
      NULL AS extension
    
    // Finally get all files under any of the directories
    UNION
    
    MATCH (p:Project {name: $projectName})
    MATCH (dir:Directory {path: $dirPath})
    MATCH (dir)-[:CONTAINS*0..]->(parent:Directory)-[:CONTAINS]->(f:File)
    RETURN
      f.path AS path,
      f.name AS name,
      'file' AS type,
      f.extension AS extension
    
    ORDER BY type DESC, path
  `,
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
  `,
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
  CHECK_FILE_EXISTS: 'MATCH (f:File {path: $filePath}) RETURN f',
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
  `,
};

// Function Calls
export const FUNCTION_CALL_QUERIES = {
  CREATE_FUNCTION_CALL_RELATIONSHIP: `
    MATCH (caller:Function {name: $callerName, filePath: $filePath})
    MATCH (callee:Function {name: $calleeName})
    MERGE (caller)-[:CALLS]->(callee)
  `,
};

// File Import Queries
export const FILE_IMPORT_QUERIES = {
  GET_FILE_IMPORTS: `
    MATCH (f:File {path: $filePath})-[:IMPORTS]->(i:Import)
    RETURN i.source AS importSource
  `,
};
