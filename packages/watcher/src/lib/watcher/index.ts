import * as chokidar from 'chokidar';
import path from 'path';
import { seedGraphForFolder } from '../seeder';
import logger from '@/utils/logger';
import { redisService, fileSystemService } from '@/services';
import { IWatcherManager } from '@/interfaces/services.interface';

/**
 * Process manager for file watchers
 */
export class WatcherManager implements IWatcherManager {
  private watchers: Map<string, { watcher: chokidar.FSWatcher, processId: string, folderPath: string, projectName: string }> = new Map();

  /**
   * Start a new file watcher for a specific folder
   * @param folderPath Path to the folder to watch
   * @param projectName Name of the project
   * @returns Process ID for the watcher
   */
  async startWatcher(folderPath: string, projectName: string): Promise<string> {
    // Generate a unique process ID
    const processId = `watcher-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      // Check if directory exists
      if (!fileSystemService.directoryExists(folderPath)) {
        throw new Error(`Directory does not exist: ${folderPath}`);
      }
      
      // Initial seeding of graph database
      logger.info(`Seeding graph for folder: ${folderPath}`);
      await redisService.publishStatus(processId, 'seeding', `Starting graph seeding for ${folderPath}`);
      
      const seedResult = await seedGraphForFolder({
        root: folderPath,
        project: projectName
      });
      
      if (!seedResult.success) {
        logger.error(`Failed to seed graph for folder: ${folderPath}`, seedResult.message);
        await redisService.publishStatus(processId, 'error', `Failed to seed graph: ${seedResult.message}`);
        throw new Error(`Failed to seed graph: ${seedResult.message}`);
      }
      
      await redisService.publishStatus(processId, 'seeded', `Graph seeded successfully for ${folderPath}`);
      
      // Initialize chokidar watcher
      logger.info(`Initializing watcher for folder: ${folderPath}`);
      const watcher = chokidar.watch(folderPath, {
        ignored: [
          '**/node_modules/**', 
          '**/dist/**', 
          '**/.git/**',
          '**/coverage/**',
          '**/logs/**',
          '**/.next/**',
          '**/build/**'
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        }
      });
      
      // Set up event handlers
      watcher
        .on('add', async (filePath) => {
          const relativePath = path.relative(folderPath, filePath);
          logger.info(`File added: ${relativePath}`);
          
          await redisService.publishFileChange(processId, 'add', relativePath);
          
          // Reseed the graph for the changed file
          await seedGraphForFolder({
            root: folderPath,
            project: projectName
          });
        })
        .on('change', async (filePath) => {
          const relativePath = path.relative(folderPath, filePath);
          logger.info(`File changed: ${relativePath}`);
          
          await redisService.publishFileChange(processId, 'change', relativePath);
          
          // Reseed the graph for the changed file
          await seedGraphForFolder({
            root: folderPath,
            project: projectName
          });
        })
        .on('unlink', async (filePath) => {
          const relativePath = path.relative(folderPath, filePath);
          logger.info(`File deleted: ${relativePath}`);
          
          await redisService.publishFileChange(processId, 'unlink', relativePath);
          
          // Reseed the graph to reflect the deletion
          await seedGraphForFolder({
            root: folderPath,
            project: projectName
          });
        })
        .on('error', async (error) => {
          logger.error(`Watcher error for ${folderPath}:`, error);
          await redisService.publishStatus(processId, 'error', `Watcher error: ${error.message}`);
        });
      
      // Store watcher in the map
      this.watchers.set(processId, { 
        watcher,
        processId,
        folderPath,
        projectName
      });
      
      await redisService.publishStatus(processId, 'started', `File watcher started for ${folderPath}`);
      logger.info(`Started file watcher for ${folderPath} with process ID: ${processId}`);
      
      return processId;
    } catch (error) {
      logger.error(`Failed to start watcher for ${folderPath}:`, error);
      await redisService.publishStatus(
        processId, 
        'error', 
        `Failed to start watcher: ${error instanceof Error ? error.message : String(error)}`
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
      
      await redisService.publishStatus(processId, 'restarting', 'Restarting file watcher');
      
      // Re-initialize the watcher with the same settings
      const watcher = chokidar.watch(watcherData.folderPath, {
        ignored: [
          '**/node_modules/**', 
          '**/dist/**', 
          '**/.git/**',
          '**/coverage/**',
          '**/logs/**',
          '**/.next/**',
          '**/build/**'
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        }
      });
      
      // Set up event handlers
      watcher
        .on('add', async (filePath) => {
          const relativePath = path.relative(watcherData.folderPath, filePath);
          logger.info(`File added: ${relativePath}`);
          
          await redisService.publishFileChange(processId, 'add', relativePath);
          
          // Reseed the graph for the changed file
          await seedGraphForFolder({
            root: watcherData.folderPath,
            project: watcherData.projectName
          });
        })
        .on('change', async (filePath) => {
          const relativePath = path.relative(watcherData.folderPath, filePath);
          logger.info(`File changed: ${relativePath}`);
          
          await redisService.publishFileChange(processId, 'change', relativePath);
          
          // Reseed the graph for the changed file
          await seedGraphForFolder({
            root: watcherData.folderPath,
            project: watcherData.projectName
          });
        })
        .on('unlink', async (filePath) => {
          const relativePath = path.relative(watcherData.folderPath, filePath);
          logger.info(`File deleted: ${relativePath}`);
          
          await redisService.publishFileChange(processId, 'unlink', relativePath);
          
          // Reseed the graph to reflect the deletion
          await seedGraphForFolder({
            root: watcherData.folderPath,
            project: watcherData.projectName
          });
        })
        .on('error', async (error) => {
          logger.error(`Watcher error for ${watcherData.folderPath}:`, error);
          await redisService.publishStatus(processId, 'error', `Watcher error: ${error.message}`);
        });
      
      // Update the watcher in the map
      this.watchers.set(processId, {
        ...watcherData,
        watcher
      });
      
      await redisService.publishStatus(processId, 'restarted', 'File watcher restarted successfully');
      logger.info(`Restarted file watcher with process ID: ${processId}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to restart watcher with process ID ${processId}:`, error);
      await redisService.publishStatus(
        processId, 
        'error', 
        `Failed to restart watcher: ${error instanceof Error ? error.message : String(error)}`
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
      
      await redisService.publishStatus(processId, 'killed', 'File watcher stopped successfully');
      logger.info(`Killed file watcher with process ID: ${processId}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to kill watcher with process ID ${processId}:`, error);
      await redisService.publishStatus(
        processId, 
        'error', 
        `Failed to kill watcher: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
  
  /**
   * Get all active watchers with details
   * @returns Array of active watcher details
   */
  getActiveWatchers(): { processId: string; folderPath: string; projectName: string }[] {
    return Array.from(this.watchers.values()).map(({ processId, folderPath, projectName }) => ({
      processId,
      folderPath,
      projectName
    }));
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
        await redisService.publishStatus(processId, 'shutdown', 'File watcher closed during server shutdown');
        logger.info(`Closed watcher with process ID: ${processId}`);
      } catch (error) {
        logger.error(`Error closing watcher with process ID ${processId}:`, error);
      }
    }
    
    // Clear the map
    this.watchers.clear();
    
    logger.info('Cleaned up all watchers');
  }
}

// Export singleton instance
const watcherManager = new WatcherManager();
export default watcherManager;
