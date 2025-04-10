import path from 'path';
import logger from '@/utils/logger';
import { FileNode } from '@/interfaces';
import { SeedingStrategy } from './base.strategy';
import { neo4jService, redisService, fileSystemService } from '@/services';
import { processorFactory } from '../processors';

/**
 * A strategy for handling single file changes (add, change, unlink)
 * This is used when the file watcher detects changes
 */
export class FileChangeSeedingStrategy implements SeedingStrategy {
  /**
   * Execute the file change seeding strategy
   * @param options Options for the seeding process
   * @returns Result of the seeding operation
   */
  async execute(options: {
    rootPath: string;
    projectName: string;
    versionName: string;
    filePath: string;
    changeType: 'add' | 'change' | 'unlink';
  }): Promise<{ success: boolean; message: string }> {
    const { rootPath, projectName, versionName, filePath, changeType } =
      options;

    logger.info(`Processing ${changeType} event for file: ${filePath}`);

    try {
      if (changeType === 'unlink') {
        // Handle file deletion
        logger.info(`Marking file as deleted: ${filePath}`);

        // Mark file as deleted in current version
        await neo4jService.markFileAsDeleted(filePath, versionName);

        // Remove from Redis
        await redisService.deleteFileData(projectName, filePath);

        return {
          success: true,
          message: `Successfully marked file ${filePath} as deleted in version ${versionName}`,
        };
      } else {
        // Handle file addition or modification
        const fullPath = path.join(rootPath, filePath);

        // Check if the file exists and is accessible
        if (!fileSystemService.fileExists(fullPath)) {
          return {
            success: false,
            message: `File does not exist or is not accessible: ${fullPath}`,
          };
        }

        // Read the file content
        const content = fileSystemService.readFileContent(fullPath);
        if (!content) {
          return {
            success: false,
            message: `Could not read content from file: ${fullPath}`,
          };
        }

        // Calculate hash
        const currentHash = fileSystemService.calculateHash(content);

        // For new files, process the directory structure first to ensure parent directories exist
        if (changeType === 'add') {
          const dirPath = path.dirname(filePath);
          if (dirPath !== '.') {
            // Process parent directory structure to ensure it exists in the graph
            await processorFactory
              .getDirectoryProcessor()
              .processDirectory(
                path.join(rootPath, dirPath),
                rootPath,
                projectName
              );
          }
        }

        // Store in Redis
        await redisService.storeFileData(
          projectName,
          filePath,
          content,
          currentHash
        );

        // Process the file with the appropriate processors
        const fileNode: FileNode = {
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath),
          content,
        };

        // Use the processor factory to process the file
        const processingResult = await processorFactory.processFile(fileNode, {
          projectName,
          versionName,
          changeType,
        });

        if (!processingResult.success) {
          return {
            success: false,
            message: `Error processing file ${filePath}: ${processingResult.message}`,
          };
        }

        return {
          success: true,
          message: `Successfully processed file ${filePath} in version ${versionName} using processors: ${processingResult.processedBy.join(
            ', '
          )}`,
        };
      }
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
      return {
        success: false,
        message: `Error processing file ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
