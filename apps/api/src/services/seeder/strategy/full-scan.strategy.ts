import logger from '@/utils/logger';
import { FileNode } from '@/interfaces';
import { SeedingStrategy } from './base.strategy';
import { neo4jService, redisService, fileSystemService } from '@/services';
import { processorFactory } from '../processors';

/**
 * A strategy for seeding the graph database with the entire directory content
 * This is used for the initial scan of a project
 */
export class FullScanSeedingStrategy implements SeedingStrategy {
  /**
   * Execute the full scan seeding strategy
   * @param options Options for the seeding process
   * @returns Result of the seeding operation
   */
  async execute(options: {
    rootPath: string;
    projectName: string;
  }): Promise<{ success: boolean; message: string }> {
    const { rootPath, projectName } = options;

    try {
      // Process the file structure (directories and files)
      logger.info(`Processing directory structure for ${rootPath}`);
      await processorFactory.processDirectory(rootPath, rootPath, projectName);
      logger.info(`Finished processing directory structure`);

      // Get all files from disk
      const filesFromDisk = fileSystemService.getAllFilesFromDisk(rootPath);
      logger.info(`Found ${filesFromDisk.length} files on disk`);

      // Get all existing file keys from Redis for this project
      const redisFileKeys = await redisService.getProjectFileKeys(projectName);
      const diskFilePaths = filesFromDisk.map(
        (f) => `project:${projectName}:file:${f.relativePath}`
      );

      // Find deleted files (in Redis but not on disk)
      const deletedFilePaths = redisFileKeys.filter(
        (key) => !diskFilePaths.includes(key)
      );

      // Process deleted files
      for (const deletedFilePath of deletedFilePaths) {
        const filePath = deletedFilePath.replace(
          `project:${projectName}:file:`,
          ''
        );
        logger.info(`Marking file as deleted: ${filePath}`);

        // Mark file as deleted in Neo4j
        await neo4jService.markFileAsDeleted(filePath);

        // Remove from Redis
        await redisService.deleteFileData(projectName, filePath);
      }

      // Process files to find changes
      const newOrChangedFiles: FileNode[] = [];
      const unchangedFiles: string[] = [];

      for (const file of filesFromDisk) {
        const currentHash = fileSystemService.calculateHash(file.content);

        // Get stored hash from Redis
        const storedHash = await redisService.getFileHash(
          projectName,
          file.relativePath
        );

        // Check if file has changed
        if (!storedHash || storedHash !== currentHash) {
          // File is new or changed
          newOrChangedFiles.push(fileSystemService.convertToFileNode(file));

          // Update Redis
          await redisService.storeFileData(
            projectName,
            file.relativePath,
            file.content,
            currentHash
          );
        } else {
          // File is unchanged
          unchangedFiles.push(file.relativePath);
        }
      }

      logger.info(`Found ${newOrChangedFiles.length} new or changed files`);
      logger.info(`Found ${unchangedFiles.length} unchanged files`);

      // Filter out files that are too large
      const filteredFiles =
        fileSystemService.filterLargeFiles(newOrChangedFiles);

      // Process each file that needs processing
      logger.info(
        `Processing ${filteredFiles.length} files with specialized processors`
      );

      // Track file processing statistics
      let processed = 0;
      let failed = 0;

      // Process each file with the processor factory
      for (const file of filteredFiles) {
        try {
          // Use the processor factory to process the file
          const processingResult = await processorFactory.processFile(file, {
            projectName,
            changeType: 'change', // Treat all files as changed for processing purposes
          });

          if (processingResult.success) {
            processed++;
            if (processed % 100 === 0) {
              logger.info(`Processed ${processed} files so far...`);
            }
          } else {
            failed++;
            logger.warn(
              `Failed to process file ${file.path}: ${processingResult.message}`
            );
          }
        } catch (error) {
          failed++;
          logger.error(`Error processing file ${file.path}:`, error);
        }
      }

      logger.info(
        `Successfully seeded the graph database for project: ${projectName}`
      );
      logger.info(
        `Processed: ${processed}, Failed: ${failed}, Unchanged: ${unchangedFiles.length}`
      );

      return {
        success: true,
        message: `Successfully seeded the graph database for project: ${projectName}. Processed ${filesFromDisk.length} files (${newOrChangedFiles.length} changed, ${processed} successfully processed, ${failed} failed)`,
      };
    } catch (error) {
      logger.error(`Error in full scan seeding:`, error);
      return {
        success: false,
        message: `Error in full scan seeding: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
