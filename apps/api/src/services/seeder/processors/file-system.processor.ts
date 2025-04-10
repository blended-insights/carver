import path from 'path';
import { FileNode } from '@/interfaces';
import { FileProcessor } from './base.processor';
import { neo4jService } from '@/services';
import logger from '@/utils/logger';

/**
 * Processor for file system structure
 * Handles creating File nodes and their relationships to directories
 */
export class FileSystemProcessor implements FileProcessor {
  /**
   * All files can be processed for file system structure
   * @param file The file to check
   * @returns Always returns true
   */
  canProcess(file: FileNode): boolean {
    return true; // Can process any file
  }

  /**
   * Process a file to create its file node and relationships
   * @param file The file to process
   * @param options Processing options
   * @returns Processing result
   */
  async processFile(
    file: FileNode,
    options: {
      projectName: string;
      versionName: string;
      changeType?: 'add' | 'change' | 'unlink';
    }
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { projectName, versionName, changeType } = options;

    try {
      // Skip processing for deleted files
      if (changeType === 'unlink') {
        return {
          success: true,
          message: `File system processor skipped deleted file: ${file.path}`,
        };
      }

      const fileName = path.basename(file.path);
      const fileExtension = path.extname(fileName);
      let dirPath = path.dirname(file.path);

      // If dirPath is empty (file at root), set to .
      if (!dirPath || dirPath === '') {
        dirPath = '.';
      }

      // Create the file node
      await neo4jService.createFileNode(
        file.path,
        fileName,
        fileExtension,
        dirPath,
        projectName
      );

      // Create relationship to the current version
      await neo4jService.createFileVersionRelationship(
        file.path,
        versionName
      );

      logger.debug(`Processed file system structure for: ${file.path}`);

      return {
        success: true,
        message: `Successfully processed file system structure for: ${file.path}`,
      };
    } catch (error) {
      logger.error(`Error processing file structure for ${file.path}:`, error);
      return {
        success: false,
        message: `Error processing file structure for ${file.path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Create directory nodes and relationships in the graph
   * @param dirPath Directory path (relative to project root)
   * @param projectName Project name
   * @returns Processing result
   */
  async processDirectory(
    dirPath: string,
    projectName: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const dirName = path.basename(dirPath);
      
      // If it's the root directory (.), use a special name
      const displayName = dirPath === '.' ? '(root)' : dirName;

      // Create directory node
      await neo4jService.createDirectoryNode(dirPath, displayName, projectName);

      // Only create parent-child relationship for non-root dirs
      if (dirPath !== '.') {
        const parentPath = path.dirname(dirPath);
        // Normalize parent path to . if it's empty
        const normalizedParentPath = !parentPath || parentPath === '' ? '.' : parentPath;
        
        await neo4jService.createDirectoryRelationship(normalizedParentPath, dirPath);
      }

      logger.debug(`Processed directory structure for: ${dirPath}`);

      return {
        success: true,
        message: `Successfully processed directory structure for: ${dirPath}`,
      };
    } catch (error) {
      logger.error(`Error processing directory structure for ${dirPath}:`, error);
      return {
        success: false,
        message: `Error processing directory structure for ${dirPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
