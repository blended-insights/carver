import logger from '@/utils/logger';
import redisService from '@/core/database/redis';
import fileSystemService from '../filesystem.service';
import gitVersionManagerFactory from '../git-versioning/factory';
import { ISeederFunction, IWatcherManager, WatcherData } from './interfaces';
import { WatcherConfig } from './watcher-config';
import { WatcherEventHandler } from './event-handler';

/**
 * Process manager for file watchers
 * Manages the lifecycle of file watchers and their associated data
 */
export class WatcherManager implements IWatcherManager {
  private watchers: Map<string, WatcherData> = new Map();
  private seederFunction: ISeederFunction;
  private watcherConfig: WatcherConfig;
  private eventHandler: WatcherEventHandler;

  /**
   * Constructor for WatcherManager
   * @param seederFunction The function to use for seeding the graph database
   */
  constructor(seederFunction: ISeederFunction) {
    this.seederFunction = seederFunction;
    this.watcherConfig = new WatcherConfig();
    this.eventHandler = new WatcherEventHandler();
  }

  /**
   * Generate a unique process ID
   * @returns Unique process ID string
   */
  private generateProcessId(): string {
    return `watcher-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }

  /**
   * Start a new file watcher for a specific folder
   * @param folderPath Path to the folder to watch
   * @param projectName Name of the project
   * @returns Process ID for the watcher
   */
  async startWatcher(folderPath: string, projectName: string): Promise<string> {
    // Generate a unique process ID
    const processId = this.generateProcessId();

    try {
      // Check if directory exists
      if (!fileSystemService.directoryExists(folderPath)) {
        throw new Error(`Directory does not exist: ${folderPath}`);
      }

      // Initial seeding of graph database
      logger.info(`Seeding graph for folder: ${folderPath}`);
      await redisService.publishStatus(
        processId,
        'seeding',
        `Starting graph seeding for ${folderPath}`
      );

      // For initial seeding, we need to process the entire folder
      const seedResult = await this.seederFunction({
        root: folderPath,
        project: projectName,
      });

      if (!seedResult.success) {
        logger.error(
          `Failed to seed graph for folder: ${folderPath}`,
          seedResult.message
        );
        await redisService.publishStatus(
          processId,
          'error',
          `Failed to seed graph: ${seedResult.message}`
        );
        throw new Error(`Failed to seed graph: ${seedResult.message}`);
      }

      await redisService.publishStatus(
        processId,
        'seeded',
        `Graph seeded successfully for ${folderPath}`
      );

      // Initialize chokidar watcher with standard configuration
      logger.info(`Initializing watcher for folder: ${folderPath}`);
      const watcher = this.watcherConfig.createWatcher(folderPath);

      // Set up event handlers
      this.eventHandler.setupEventHandlers(
        watcher,
        processId,
        folderPath,
        projectName,
        this.seederFunction
      );

      // Store watcher in the map
      this.watchers.set(processId, {
        watcher,
        processId,
        folderPath,
        projectName,
      });

      await redisService.publishStatus(
        processId,
        'started',
        `File watcher started for ${folderPath}`
      );
      logger.info(
        `Started file watcher for ${folderPath} with process ID: ${processId}`
      );

      return processId;
    } catch (error) {
      logger.error(`Failed to start watcher for ${folderPath}:`, error);
      await redisService.publishStatus(
        processId,
        'error',
        `Failed to start watcher: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Restart an existing file watcher
   * @param processId Process ID of the watcher to restart
   * @returns Boolean indicating success
   */
  async restartWatcher(processId: string): Promise<boolean> {
    const watcherData = this.watchers.get(processId);

    if (!watcherData) {
      logger.error(`Cannot restart watcher: Process ID ${processId} not found`);
      return false;
    }

    try {
      // Close existing watcher
      await watcherData.watcher.close();

      await redisService.publishStatus(
        processId,
        'restarting',
        'Restarting file watcher'
      );

      // Create a new watcher with standard configuration
      const watcher = this.watcherConfig.createWatcher(watcherData.folderPath);

      // Set up event handlers
      this.eventHandler.setupEventHandlers(
        watcher,
        processId,
        watcherData.folderPath,
        watcherData.projectName,
        this.seederFunction
      );

      // Update the watcher in the map
      this.watchers.set(processId, {
        ...watcherData,
        watcher,
      });

      await redisService.publishStatus(
        processId,
        'restarted',
        'File watcher restarted successfully'
      );
      logger.info(`Restarted file watcher with process ID: ${processId}`);

      return true;
    } catch (error) {
      logger.error(
        `Failed to restart watcher with process ID ${processId}:`,
        error
      );
      await redisService.publishStatus(
        processId,
        'error',
        `Failed to restart watcher: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Kill an existing file watcher
   * @param processId Process ID of the watcher to kill
   * @returns Boolean indicating success
   */
  async killWatcher(processId: string): Promise<boolean> {
    const watcherData = this.watchers.get(processId);

    if (!watcherData) {
      logger.error(`Cannot kill watcher: Process ID ${processId} not found`);
      return false;
    }

    try {
      // Close the watcher
      await watcherData.watcher.close();

      // Remove from the map
      this.watchers.delete(processId);

      await redisService.publishStatus(
        processId,
        'killed',
        'File watcher stopped successfully'
      );
      logger.info(`Killed file watcher with process ID: ${processId}`);

      return true;
    } catch (error) {
      logger.error(
        `Failed to kill watcher with process ID ${processId}:`,
        error
      );
      await redisService.publishStatus(
        processId,
        'error',
        `Failed to kill watcher: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Get all active watchers with details
   * @returns Array of active watcher details
   */
  getActiveWatchers(): {
    processId: string;
    folderPath: string;
    projectName: string;
    status: 'running';
  }[] {
    return Array.from(this.watchers.values()).map(
      ({ processId, folderPath, projectName }) => ({
        processId,
        folderPath,
        projectName,
        status: 'running',
      })
    );
  }

  /**
   * Get active watcher process IDs
   * @returns Array of active watcher process IDs
   */
  getActiveWatcherIds(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Cleanup all watchers (to be called when shutting down)
   */
  async cleanup(): Promise<void> {
    for (const [processId, watcherData] of this.watchers.entries()) {
      try {
        await watcherData.watcher.close();
        await redisService.publishStatus(
          processId,
          'shutdown',
          'File watcher closed during server shutdown'
        );
        logger.info(`Closed watcher with process ID: ${processId}`);
      } catch (error) {
        logger.error(
          `Error closing watcher with process ID ${processId}:`,
          error
        );
      }
    }

    // Clear the map
    this.watchers.clear();

    // Cleanup any git version managers
    gitVersionManagerFactory.cleanup();

    logger.info('Cleaned up all watchers');
  }
}
