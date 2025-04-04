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
  const relativePath = path.relative(projectRoot, dirPath);
  const dirName = path.basename(dirPath);

  // Skip node_modules, dist, and hidden directories
  if (dirPath.includes("node_modules") || dirPath.includes("dist") || dirName.startsWith(".")) {
    return;
  }

  // Create Directory node if there's a relative path
  if (relativePath) {
    // Create project if it doesn't exist
    await neo4jService.createOrGetProject(projectName, projectRoot);
    
    // Create directory node
    await neo4jService.createDirectoryNode(
      relativePath,
      dirName,
      projectName
    );
    
    // Create parent-child directory relationship
    const parentPath = path.dirname(relativePath);
    if (parentPath !== ".") {
      await neo4jService.createDirectoryRelationship(
        parentPath,
        relativePath
      );
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
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(fileName);
  const fileRelativePath = path.relative(projectRoot, filePath);
  const dirRelativePath = path.dirname(fileRelativePath);
  
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
