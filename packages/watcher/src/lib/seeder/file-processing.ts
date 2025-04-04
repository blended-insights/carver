import fs from "fs";
import path from "path";
import logger from "@/utils/logger";
import { FileNode } from "@carver/shared";
import { neo4jService } from "@carver/shared";

/**
 * Processes a directory to create File and Directory nodes
 * @param dirPath - Current directory path
 * @param projectRoot - Project root directory
 * @param projectName - Name of the project
 */
export async function processDirectory(
  dirPath: string,
  projectRoot: string,
  projectName: string,
): Promise<void> {
  logger.debug(`Processing directory: ${dirPath}`);
  const relativePath = path.relative(projectRoot, dirPath);
  const dirName = path.basename(dirPath);

  // Skip node_modules, dist, and hidden directories
  if (dirPath.includes("node_modules") || dirPath.includes("dist") || dirName.startsWith(".")) {
    logger.debug(`Skipping directory: ${dirPath}`);
    return;
  }

  // Create the project node
  await neo4jService.createOrGetProject(projectName, projectRoot);
  
  // Create Directory node if there's a relative path or it's the root
  logger.debug(`Relative path: ${relativePath}, dirName: ${dirName}`);
  if (relativePath || dirPath === projectRoot) {
    // If it's the root directory, use a . as the relative path
    const nodePath = relativePath || '.';
    logger.debug(`Creating directory node with path: ${nodePath}`);
    
    // Create directory node
    await neo4jService.createDirectoryNode(
      nodePath,
      dirName,
      projectName
    );
    
    // Only create parent-child relationship for non-root dirs
    if (nodePath !== '.') {
      const parentPath = path.dirname(relativePath);
      if (parentPath !== ".") {
      logger.debug(`Creating parent-child relationship: ${parentPath} -> ${nodePath}`);
      await neo4jService.createDirectoryRelationship(
        parentPath,
        nodePath
      );
      }
    }

    
    // Process children
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        await processDirectory(entryPath, projectRoot, projectName);
      } else if (entry.isFile()) {
        // Process file
        await processFile(entryPath, projectRoot, projectName);
      }
    }
  }
}

/**
 * Process a single file to create File node and relationships
 * @param filePath - Path to the file
 * @param projectRoot - Project root directory
 * @param projectName - Project name
 */
async function processFile(
  filePath: string,
  projectRoot: string,
  projectName: string
): Promise<void> {
  logger.debug(`Processing file: ${filePath}`);
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(fileName);
  const fileRelativePath = path.relative(projectRoot, filePath);
  let dirRelativePath = path.dirname(fileRelativePath);
  // If dirRelativePath is empty (file at root), set to .
  if (!dirRelativePath || dirRelativePath === '') {
    dirRelativePath = '.';
  }
  logger.debug(`File directory path: ${dirRelativePath}`);
  
  // Create file node
  await neo4jService.createFileNode(
    fileRelativePath,
    fileName,
    fileExtension,
    dirRelativePath,
    projectName
  );
  
  // Get the latest version and create a relationship if it exists
  const versionName = await neo4jService.getLatestVersionName(projectName);
  if (versionName) {
    await neo4jService.createFileVersionRelationship(fileRelativePath, versionName);
  }
}

/**
 * Retrieves all File nodes from the database
 * @param projectRoot - Project root directory
 */
export async function getFiles(projectRoot: string): Promise<FileNode[]> {
  // Get all files from Neo4j
  const files = await neo4jService.getAllFiles();
  
  // Add content to each file
  return files.map((file) => {
    const fullPath = path.join(projectRoot, file.path);
    let content = "";

    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch (error) {
      logger.warn(`Could not read file content for ${file.path}`);
    }

    return {
      path: file.path,
      name: file.name,
      extension: file.extension,
      content,
    };
  });
}

/**
 * Creates a new version for a project and returns the version name
 * @param projectName - Project name
 */
export async function createNewVersion(projectName: string): Promise<string> {
  // Create timestamp-based version name
  const versionName = `v_${Date.now()}`;
  
  // Create version using neo4jService
  await neo4jService.createVersion(versionName, projectName);
  
  return versionName;
}

/**
 * Marks a file as deleted in the current version
 * @param filePath - File path
 * @param projectName - Project name
 */
export async function markFileAsDeleted(filePath: string, projectName: string): Promise<void> {
  // Get the latest version
  const versionName = await neo4jService.getLatestVersionName(projectName);
  
  if (versionName) {
    await neo4jService.markFileAsDeleted(filePath, versionName);
  } else {
    logger.warn(`No version found for project ${projectName} when marking file ${filePath} as deleted`);
  }
}
