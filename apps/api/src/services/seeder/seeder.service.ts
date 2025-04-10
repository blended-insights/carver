import path from 'path';
import logger from '@/utils/logger';
import { neo4jService, gitVersionManagerFactory } from '@/services';
import { fileSystemService } from '@/services';
import { SeedingStrategy, FullScanSeedingStrategy, FileChangeSeedingStrategy } from './strategy';

/**
 * Service for seeding the Neo4j database with code structure
 * Uses a strategy pattern to handle different types of seeding operations
 */
export class SeederService {
  private fullScanStrategy: SeedingStrategy;
  private fileChangeStrategy: SeedingStrategy;

  constructor() {
    this.fullScanStrategy = new FullScanSeedingStrategy();
    this.fileChangeStrategy = new FileChangeSeedingStrategy();
  }

  /**
   * Seeds the Neo4j database with code entities using the appropriate strategy
   * @param options Options for seeding
   * @returns Success status and message
   */
  async seedGraphForFolder(options: {
    root: string;
    project: string;
    filePath?: string;
    changeType?: 'add' | 'change' | 'unlink';
  }): Promise<{ success: boolean; message: string }> {
    // Destructure options
    const { root, project, filePath, changeType } = options;

    // Validate inputs
    if (!root || !project) {
      return {
        success: false,
        message: 'Missing required parameters: root path and project name',
      };
    }

    // Resolve the root path
    const rootPath = path.resolve(root);
    const projectName = project;

    // Get or create a GitVersionManager instance for this repository
    const versionManager = gitVersionManagerFactory.getManager(
      rootPath,
      async (newVersion) => {
        // This callback will be called when git operations change the version
        logger.info(
          `Git version changed to ${newVersion} for project ${projectName}`
        );
        // We don't need to handle the callback here as file watchers will detect changes
      }
    );

    // Start watching for git changes if not already watching
    await versionManager.startWatching();

    // Get the current git-based version
    const gitVersion = await versionManager.getCurrentVersion();
    const versionName = `git_${gitVersion}`;

    // Validate that the directory exists
    if (!fileSystemService.directoryExists(rootPath)) {
      return {
        success: false,
        message: `Directory does not exist: ${rootPath}`,
      };
    }

    try {
      // Create unique constraints and indexes
      await neo4jService.createConstraintsAndIndexes();

      // Create or get Project node
      await neo4jService.createOrGetProject(projectName, rootPath);

      // Create new Version node
      await neo4jService.createVersion(versionName, projectName);

      // Choose the appropriate strategy based on the parameters
      if (filePath && changeType) {
        // Use the file change strategy for single file changes
        return await this.fileChangeStrategy.execute({
          rootPath,
          projectName,
          versionName,
          filePath,
          changeType,
        });
      } else {
        // Use the full scan strategy for initial seeding
        return await this.fullScanStrategy.execute({
          rootPath,
          projectName,
          versionName,
        });
      }
    } catch (error) {
      logger.error('Error seeding graph database:', error);
      return {
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}

// Create a singleton instance
export const seederService = new SeederService();
