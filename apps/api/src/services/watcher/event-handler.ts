import path from 'path';
import * as chokidar from 'chokidar';
import logger from '@/utils/logger';
import redisService from '@/core/database/redis';
import { ISeederFunction } from './interfaces';

/**
 * Handles setting up and managing watcher events
 * Eliminates duplication in event handling between start and restart operations
 */
export class WatcherEventHandler {
  /**
   * Set up event handlers for a chokidar file watcher
   * @param watcher Chokidar FSWatcher instance
   * @param processId Unique ID for this watcher process
   * @param folderPath Path to the watched folder
   * @param projectName Project name
   * @param seederFunction Function to call when files change
   * @returns The configured watcher instance
   */
  setupEventHandlers(
    watcher: chokidar.FSWatcher,
    processId: string,
    folderPath: string,
    projectName: string,
    seederFunction: ISeederFunction
  ): chokidar.FSWatcher {
    return watcher
      .on('add', async (filePath) => {
        const relativePath = path.relative(folderPath, filePath);
        logger.info(`File added: ${relativePath}`);

        await redisService.publishFileChange(processId, 'add', relativePath);

        // Only reseed the specific file that was added
        await seederFunction({
          root: folderPath,
          project: projectName,
          filePath: relativePath,
          changeType: 'add',
        });
      })
      .on('change', async (filePath) => {
        const relativePath = path.relative(folderPath, filePath);
        logger.info(`File changed: ${relativePath}`);

        await redisService.publishFileChange(processId, 'change', relativePath);

        // Only reseed the specific file that was changed
        await seederFunction({
          root: folderPath,
          project: projectName,
          filePath: relativePath,
          changeType: 'change',
        });
      })
      .on('unlink', async (filePath) => {
        const relativePath = path.relative(folderPath, filePath);
        logger.info(`File deleted: ${relativePath}`);

        await redisService.publishFileChange(processId, 'unlink', relativePath);

        // Only handle the specific file that was deleted
        await seederFunction({
          root: folderPath,
          project: projectName,
          filePath: relativePath,
          changeType: 'unlink',
        });
      })
      .on('error', async (error) => {
        logger.error(`Watcher error for ${folderPath}:`, error);
        await redisService.publishStatus(
          processId,
          'error',
          `Watcher error: ${error.message}`
        );
      });
  }
}
