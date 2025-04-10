import * as chokidar from 'chokidar';
import { createFileFilteringService } from '@/utils/file-filtering';
import logger from '@/utils/logger';

/**
 * Handles configuration of chokidar watchers
 * Centralizes watcher configuration logic
 */
export class WatcherConfig {
  /**
   * Get a chokidar-compatible ignore function
   * @param folderPath Path to the folder to watch
   * @returns A function for Chokidar's ignored option
   */
  getIgnoreFunction(folderPath: string): (path: string) => boolean {
    // Initialize the file filtering service
    const fileFilteringService = createFileFilteringService(folderPath);

    logger.info(`Created file filtering service for folder: ${folderPath}`);

    // Return the chokidar-compatible ignore function
    return fileFilteringService.getChokidarIgnoreFunction();
  }

  /**
   * Get standard configuration options for a watcher
   * @param folderPath Path to the folder to watch
   * @returns Chokidar configuration options
   */
  getWatcherOptions(folderPath: string): chokidar.WatchOptions {
    return {
      ignored: this.getIgnoreFunction(folderPath),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    };
  }

  /**
   * Create a new chokidar watcher with standard configuration
   * @param folderPath Path to the folder to watch
   * @returns Configured chokidar watcher instance
   */
  createWatcher(folderPath: string): chokidar.FSWatcher {
    return chokidar.watch(folderPath, this.getWatcherOptions(folderPath));
  }
}
