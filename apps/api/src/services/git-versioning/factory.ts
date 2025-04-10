import { GitVersionManager } from './index';
import logger from '../../utils/logger';
import {
  IGitVersionManagerFactory,
  IGitVersionManager,
} from '../../interfaces/services.interface';

/**
 * Singleton map to hold GitVersionManager instances for each repository
 */
class GitVersionManagerFactory implements IGitVersionManagerFactory {
  private managers: Map<string, GitVersionManager> = new Map();

  /**
   * Get a GitVersionManager instance for a specific repository
   * @param rootPath Repository root path
   * @param onVersionChange Callback when version changes
   * @returns GitVersionManager instance
   */
  public getManager(
    rootPath: string,
    onVersionChange: (version: string) => void
  ): IGitVersionManager {
    // Use the root path as the key
    if (!this.managers.has(rootPath)) {
      logger.info(`Creating new GitVersionManager for ${rootPath}`);
      const manager = new GitVersionManager(rootPath, onVersionChange);
      this.managers.set(rootPath, manager);
    }

    return this.managers.get(rootPath)!;
  }

  /**
   * Cleanup all managers
   */
  public cleanup(): void {
    for (const [rootPath, manager] of this.managers.entries()) {
      logger.info(`Stopping GitVersionManager for ${rootPath}`);
      manager.stopWatching();
    }

    this.managers.clear();
  }
}

// Export singleton instance
const gitVersionManagerFactory = new GitVersionManagerFactory();
export default gitVersionManagerFactory;
