import fs from 'fs';
import path from 'path';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';
import { FileSystemProcessor } from './file-system.processor';

/**
 * Processor for directory structure
 * Creates directory nodes and their relationships in the graph database
 */
export class DirectoryProcessor {
  private fileSystemProcessor: FileSystemProcessor;

  /**
   * Initialize the directory processor
   * @param fileSystemProcessor File system processor for handling individual files
   */
  constructor(fileSystemProcessor: FileSystemProcessor) {
    this.fileSystemProcessor = fileSystemProcessor;
  }

  /**
   * Process a directory to create directory and file nodes
   * @param dirPath Current directory path
   * @param projectRoot Project root directory
   * @param projectName Name of the project
   */
  async processDirectory(
    dirPath: string,
    projectRoot: string,
    projectName: string
  ): Promise<void> {
    logger.debug(`Processing directory: ${dirPath}`);
    const relativePath = path.relative(projectRoot, dirPath);
    const dirName = path.basename(dirPath);

    // Skip node_modules, dist, and hidden directories
    if (
      dirPath.includes('node_modules') ||
      dirPath.includes('dist') ||
      dirName.startsWith('.')
    ) {
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

      // Process the directory using the file system processor
      await this.fileSystemProcessor.processDirectory(nodePath, projectName);

      // Process children
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively process subdirectories
          await this.processDirectory(entryPath, projectRoot, projectName);
        } else if (entry.isFile()) {
          // Process file
          await this.processFile(entryPath, projectRoot, projectName);
        }
      }
    }
  }

  /**
   * Process a single file to create File node and relationships
   * @param filePath Path to the file
   * @param projectRoot Project root directory
   * @param projectName Project name
   */
  async processFile(
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
  }

  /**
   * Retrieves all File nodes from the database
   * @param projectRoot Project root directory
   * @returns Array of file nodes with content
   */
  async getFiles(projectRoot: string): Promise<{ 
    path: string;
    name: string;
    extension: string;
    content: string;
  }[]> {
    // Get all files from Neo4j
    const files = await neo4jService.getAllFiles();

    // Add content to each file
    return files.map((file) => {
      const fullPath = path.join(projectRoot, file.path);
      let content = '';

      try {
        content = fs.readFileSync(fullPath, 'utf-8');
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
   * Marks a file as deleted in the database
   * @param filePath File path
   */
  async markFileAsDeleted(
    filePath: string
  ): Promise<void> {
    await neo4jService.markFileAsDeleted(filePath);
  }
}
