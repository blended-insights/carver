import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { IFileSystemService, FileNode } from '../interfaces/services.interface';
import logger from 'src/utils/logger';

/**
 * Class to handle gitignore pattern matching
 */
class GitIgnoreParser {
  private patterns: { pattern: string; isNegated: boolean }[] = [];
  
  /**
   * Load patterns from a gitignore file
   * @param gitIgnorePath Path to the .gitignore file
   */
  loadFromFile(gitIgnorePath: string): boolean {
    try {
      if (!fs.existsSync(gitIgnorePath)) {
        return false;
      }
      
      const content = fs.readFileSync(gitIgnorePath, 'utf8');
      this.parsePatterns(content);
      return true;
    } catch (error) {
      logger.warn(`Error loading gitignore file: ${gitIgnorePath}`, error);
      return false;
    }
  }
  
  /**
   * Parse gitignore content into patterns
   * @param content Content of the gitignore file
   */
  private parsePatterns(content: string): void {
    this.patterns = content
      .split('\n')
      .map(line => line.trim())
      // Filter out empty lines and comments
      .filter(line => line && !line.startsWith('#'))
      .map(pattern => {
        const isNegated = pattern.startsWith('!');
        // Remove negation character if present
        const cleanPattern = isNegated ? pattern.substring(1) : pattern;
        return { pattern: cleanPattern, isNegated };
      });
  }
  
  /**
   * Convert a gitignore pattern to a regular expression
   * @param pattern Gitignore pattern
   */
  private patternToRegExp(pattern: string): RegExp {
    // Handle pattern directory separator
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    let regexPattern = normalizedPattern
      // Escape special regex characters except those with special meaning in gitignore
      .replace(/[.+^$|{}()]/g, '\\$&')
      // Handle ** pattern (matches any number of directories)
      .replace(/\*\*/g, '.*')
      // Handle * pattern (doesn't match directory separators)
      .replace(/\*/g, '[^/]*')
      // Handle ? pattern (single character but not directory separator)
      .replace(/\?/g, '[^/]');
    
    // Handle leading slash - if pattern starts with /, it matches from the root
    const anchorStart = normalizedPattern.startsWith('/');
    regexPattern = anchorStart ? `^${regexPattern.substring(1)}` : `(^|/)${regexPattern}`;
    
    // Handle trailing slash - if pattern ends with /, it only matches directories
    if (normalizedPattern.endsWith('/')) {
      regexPattern = `${regexPattern.substring(0, regexPattern.length - 1)}(/.*)?$`;
    } else {
      // Otherwise match exact file or directory
      regexPattern = `${regexPattern}(/.*)?$`;
    }
    
    return new RegExp(regexPattern);
  }
  
  /**
   * Check if a path should be ignored
   * @param filePath Path to check against gitignore patterns
   * @param isDirectory Whether the path is a directory
   */
  shouldIgnore(filePath: string, isDirectory = false): boolean {
    // Normalize path to use forward slashes
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Default to not ignoring
    let shouldIgnore = false;
    
    // Apply patterns in order, with later patterns overriding earlier ones
    for (const { pattern, isNegated } of this.patterns) {
      const regex = this.patternToRegExp(pattern);
      
      // Special handling for directory patterns (ending with /)
      if (pattern.endsWith('/') && !isDirectory) {
        continue; // Skip directory-only patterns for files
      }
      
      // If the pattern matches, set shouldIgnore based on whether it's negated
      if (regex.test(normalizedPath)) {
        shouldIgnore = !isNegated;
      }
    }
    
    return shouldIgnore;
  }
}

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
    const gitIgnoreParser = new GitIgnoreParser();
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
          const defaultDirExclusions = [
            entry.name.startsWith("."),
            entry.name === "node_modules",
            entry.name === "coverage",
            entry.name === "dist",
            entry.name === "docs",
            entry.name === "logs"
          ];
          
          // Default exclusions for files
          const defaultFileExclusions = [
            entry.name === ".DS_Store",
            entry.name.startsWith(".env"),
            entry.name.endsWith(".log"),
            entry.name.endsWith(".pem"),
            entry.name.endsWith(".tsbuildinfo")
          ];

          if (entry.isDirectory()) {
            // Check gitignore patterns for directories if available, otherwise use defaults
            const shouldSkip = hasGitIgnore 
              ? gitIgnoreParser.shouldIgnore(relativePath, true)
              : defaultDirExclusions.some(condition => condition);
            
            if (!shouldSkip) {
              scanDir(fullPath);
            }
          } else if (entry.isFile()) {
            try {
              // Check gitignore patterns for files if available, otherwise use defaults
              const shouldSkip = hasGitIgnore
                ? gitIgnoreParser.shouldIgnore(relativePath, false)
                : defaultFileExclusions.some(condition => condition);
              
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
      const gitIgnoreParser = new GitIgnoreParser();
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
