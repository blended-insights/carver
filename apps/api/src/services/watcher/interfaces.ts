import * as chokidar from 'chokidar';

/**
 * Interface for the seeder function
 * This allows us to decouple the watcher from the specific seeder implementation
 */
export interface ISeederFunction {
  (options: {
    root: string;
    project: string;
    filePath?: string;
    changeType?: 'add' | 'change' | 'unlink';
  }): Promise<{
    success: boolean;
    message: string;
  }>;
}

/**
 * Interface for a watcher manager
 */
export interface IWatcherManager {
  /**
   * Start a new file watcher for a specific folder
   * @param folderPath Path to the folder to watch
   * @param projectName Name of the project
   * @returns Process ID for the watcher
   */
  startWatcher(folderPath: string, projectName: string): Promise<string>;

  /**
   * Restart an existing file watcher
   * @param processId Process ID of the watcher to restart
   * @returns Boolean indicating success
   */
  restartWatcher(processId: string): Promise<boolean>;

  /**
   * Kill an existing file watcher
   * @param processId Process ID of the watcher to kill
   * @returns Boolean indicating success
   */
  killWatcher(processId: string): Promise<boolean>;

  /**
   * Get all active watchers with details
   * @returns Array of active watcher details
   */
  getActiveWatchers(): {
    processId: string;
    folderPath: string;
    projectName: string;
    status: 'running';
  }[];

  /**
   * Get active watcher process IDs
   * @returns Array of active watcher process IDs
   */
  getActiveWatcherIds(): string[];

  /**
   * Cleanup all watchers (to be called when shutting down)
   */
  cleanup(): Promise<void>;
}

/**
 * Interface for watcher data stored in the manager
 */
export interface WatcherData {
  processId: string;
  folderPath: string;
  projectName: string;
  watcher: chokidar.FSWatcher;
}
