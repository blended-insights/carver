import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import { GitIgnoreParser } from './gitignore-parser';

/**
 * A utility class to handle file filtering operations
 * This provides a unified approach to file filtering for both
 * the seeder process and watcher service
 */
export class FileFilteringService {
  private gitIgnoreParser: GitIgnoreParser;
  private projectRoot: string;
  private standardPatterns: string[];

  /**
   * Initialize the file filtering service
   * @param projectRoot Root directory of the project
   */
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.gitIgnoreParser = new GitIgnoreParser();
    this.standardPatterns = [
      '.git',
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.DS_Store',
      'tmp',
      'out-tsc',
      '.sass-cache',
      'connect.lock',
      'libpeerconnection.log',
      'npm-debug.log',
      'yarn-error.log',
      'testem.log',
      '.nx/cache',
      '.next',
      'out',
      '.env',
      'test-output',
      '.vscode',
      '.idea',
      // Add other common patterns here
    ];

    // Load gitignore patterns
    this.loadGitIgnorePatterns();
  }

  /**
   * Load gitignore patterns from project's .gitignore file
   */
  private loadGitIgnorePatterns(): void {
    const gitIgnorePath = path.join(this.projectRoot, '.gitignore');
    const hasGitIgnore = this.gitIgnoreParser.loadFromFile(gitIgnorePath);

    if (hasGitIgnore) {
      logger.info(`Loaded gitignore patterns from ${gitIgnorePath}`);
    } else {
      logger.info(
        `No gitignore file found at ${gitIgnorePath}, using default exclusions`
      );
    }
  }

  /**
   * Check if a file should be ignored based on gitignore patterns and standard exclusions
   * @param filePath Path to check relative to project root
   * @param isDirectory Whether this path is a directory
   * @returns Boolean indicating if the path should be ignored
   */
  public shouldIgnorePath(filePath: string, isDirectory = false): boolean {
    // Normalize path to use forward slashes
    let normalizedPath = filePath.replace(/\\/g, '/');
    
    // Remove leading slash for consistency
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }

    // Fast-path checks for common exclusions
    const fileName = path.basename(normalizedPath);
    
    // Always ignore .DS_Store files
    if (fileName === '.DS_Store') {
      return true;
    }
    
    // Check standard patterns first
    for (const pattern of this.standardPatterns) {
      if (
        normalizedPath === pattern ||
        normalizedPath.startsWith(`${pattern}/`) ||
        normalizedPath.includes(`/${pattern}/`) ||
        normalizedPath.endsWith(`/${pattern}`)
      ) {
        return true;
      }
    }

    // Then check gitignore patterns if available
    return this.gitIgnoreParser.shouldIgnore(normalizedPath, isDirectory);
  }

  /**
   * Get chokidar-compatible ignore patterns
   * @returns A function to test paths for chokidar
   */
  public getChokidarIgnoreFunction(): (path: string) => boolean {
    return (path: string) => {
      // Normalize path to use forward slashes
      const normalizedPath = path.replace(/\\/g, '/');
      
      // Get relative path from project root
      const relativePath = normalizedPath.startsWith(this.projectRoot)
        ? normalizedPath.substring(this.projectRoot.length + 1)
        : normalizedPath;
      
      // Check if path should be ignored
      const isDir = fs.existsSync(path) && fs.statSync(path).isDirectory();
      const shouldIgnore = this.shouldIgnorePath(relativePath, isDir);
      
      // Log decisions for debugging specific patterns
      if (normalizedPath.includes('.DS_Store') || normalizedPath.includes('node_modules')) {
        logger.debug(`[File Filter] ${shouldIgnore ? 'Ignoring' : 'Accepting'}: ${relativePath}`);
      }
      
      return shouldIgnore;
    };
  }
}

/**
 * Factory function to create a FileFilteringService instance
 * @param projectRoot Root directory of the project
 * @returns A new FileFilteringService instance
 */
export function createFileFilteringService(projectRoot: string): FileFilteringService {
  return new FileFilteringService(projectRoot);
}
