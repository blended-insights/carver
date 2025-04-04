import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { IFileSystemService, FileNode } from '../interfaces/services.interface';
import logger from 'src/utils/logger';
import { createGitIgnoreParser } from '../utils/gitignore-parser';

/**
 * Service to handle all file system operations
 */
export class FileSystemService implements IFileSystemService {
  /**
   * Calculate a hash for file content
   * @param content File content
   */
  calculateHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }
  
  /**
   * Get all files recursively from disk
   * @param rootPath Root directory path
   */
  getAllFilesFromDisk(rootPath: string): { relativePath: string; content: string }[] {
    const result: { relativePath: string; content: string }[] = [];
    
    // Initialize gitignore parser
    const gitIgnoreParser = createGitIgnoreParser();
    const gitIgnorePath = path.join(rootPath, '.gitignore');
    
    // Load gitignore patterns if available
    const hasGitIgnore = gitIgnoreParser.loadFromFile(gitIgnorePath);
    
    if (hasGitIgnore) {
      logger.info(`Loaded gitignore patterns from ${gitIgnorePath}`);
    } else {
      logger.info(`No gitignore file found at ${gitIgnorePath}, using default exclusions`);
    }
    
    const scanDir = (dirPath: string) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          // Get path relative to the root (for gitignore matching)
          const relativePath = path.relative(rootPath, fullPath);
          
          // Default exclusions for directories
          const defaultDirExclusions = gitIgnoreParser.getDefaultDirExclusions();
          
          // Default exclusions for files
          const defaultFileExclusions = gitIgnoreParser.getDefaultFileExclusions();

          if (entry.isDirectory()) {
            // Check gitignore patterns for directories if available, otherwise use defaults
            const shouldSkip = hasGitIgnore 
              ? gitIgnoreParser.shouldIgnore(relativePath, true)
              : defaultDirExclusions.some(condition => condition(entry.name));
            
            if (!shouldSkip) {
              scanDir(fullPath);
            }
          } else if (entry.isFile()) {
            try {
              // Check gitignore patterns for files if available, otherwise use defaults
              const shouldSkip = hasGitIgnore
                ? gitIgnoreParser.shouldIgnore(relativePath, false)
                : defaultFileExclusions.some(condition => condition(entry.name));
              
              if (!shouldSkip) {
                const content = fs.readFileSync(fullPath, "utf-8");
                result.push({ relativePath, content });
              }
            } catch (error) {
              logger.warn(`Could not read file: ${fullPath}`);
            }
          }
        }
      } catch (error) {
        logger.error(`Error scanning directory ${dirPath}:`, error);
      }
    };

    scanDir(rootPath);
    return result;
  }
  
  /**
   * Convert file from disk to FileNode format
   * @param file File data
   */
  convertToFileNode(file: { relativePath: string; content: string }): FileNode {
    return {
      path: file.relativePath,
      name: path.basename(file.relativePath),
      extension: path.extname(file.relativePath),
      content: file.content,
    };
  }
  
  /**
   * Check if a directory exists
   * @param dirPath Directory path
   */
  directoryExists(dirPath: string): boolean {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch (error) {
      return false;
    }
  }
  
  /**
   * List all directories in a path
   * @param dirPath Directory path
   */
  listDirectories(dirPath: string): { name: string; path: string; size: number }[] {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      // Initialize gitignore parser
      const gitIgnoreParser = createGitIgnoreParser();
      const gitIgnorePath = path.join(dirPath, '.gitignore');
      const hasGitIgnore = gitIgnoreParser.loadFromFile(gitIgnorePath);
      
      return entries
        .filter(entry => {
          if (!entry.isDirectory()) return false;
          
          // Skip dot directories by default
          if (entry.name.startsWith('.')) return false;
          
          // If we have a gitignore file, use it for filtering
          if (hasGitIgnore) {
            const relativePath = entry.name;
            return !gitIgnoreParser.shouldIgnore(relativePath, true);
          }
          
          return true;
        })
        .map(entry => {
          const folderPath = path.join(dirPath, entry.name);
          return {
            name: entry.name,
            path: folderPath,
            size: this.calculateFolderSize(folderPath)
          };
        });
    } catch (error) {
      logger.error(`Error listing directories in ${dirPath}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate folder size (limited to top-level files for performance)
   * @param folderPath Folder path
   */
  private calculateFolderSize(folderPath: string): number {
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      let size = 0;
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(folderPath, entry.name);
          const stats = fs.statSync(filePath);
          size += stats.size;
        }
      }
      
      return size;
    } catch (error) {
      logger.warn(`Error calculating folder size for ${folderPath}:`, error);
      return 0;
    }
  }
  
  /**
   * Filter TypeScript/JavaScript files
   * @param files List of files
   */
  filterTypeScriptFiles(files: FileNode[]): FileNode[] {
    return files.filter((file) => [".ts", ".tsx", ".js", ".jsx"].includes(file.extension));
  }
  
  /**
   * Filter out files that are too large
   * @param files List of files
   * @param maxSize Maximum file size in bytes
   */
  filterLargeFiles(files: FileNode[], maxSize: number = 1024 * 1024): FileNode[] {
    return files.filter((file) => {
      if (file.content.length > maxSize) {
        logger.warn(`Skipping large file: ${file.path}`);
        return false;
      }
      return true;
    });
  }
}

// Export singleton instance
const fileSystemService = new FileSystemService();
export default fileSystemService;
