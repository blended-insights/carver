import path from 'path';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';
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

      // Choose the appropriate strategy based on the parameters
      if (filePath && changeType) {
        // Use the file change strategy for single file changes
        return await this.fileChangeStrategy.execute({
          rootPath,
          projectName,
          filePath,
          changeType,
        });
      } else {
        // Use the full scan strategy for initial seeding
        return await this.fullScanStrategy.execute({
          rootPath,
          projectName,
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
