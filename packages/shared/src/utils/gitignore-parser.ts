import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

/**
 * Class to handle gitignore pattern matching
 * Used to filter files and directories based on gitignore patterns
 */
export class GitIgnoreParser {
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

  /**
   * Get default directory exclusions
   * @returns Array of test functions for default directory exclusions
   */
  getDefaultDirExclusions(): ((name: string) => boolean)[] {
    return [
      (name: string) => name.startsWith("."),
      (name: string) => name === "node_modules",
      (name: string) => name === "coverage",
      (name: string) => name === "dist",
      (name: string) => name === "docs",
      (name: string) => name === "logs",
      (name: string) => name === "build",
      (name: string) => name === ".next"
    ];
  }

  /**
   * Get default file exclusions
   * @returns Array of test functions for default file exclusions
   */
  getDefaultFileExclusions(): ((name: string) => boolean)[] {
    return [
      (name: string) => name === ".DS_Store",
      (name: string) => name.startsWith(".env"),
      (name: string) => name.endsWith(".log"),
      (name: string) => name.endsWith(".pem"),
      (name: string) => name.endsWith(".tsbuildinfo")
    ];
  }

  /**
   * Convert patterns to an array of glob patterns for use with chokidar
   * @returns Array of glob patterns
   */
  toChokidarIgnorePatterns(): string[] {
    // Standard directories to ignore
    const standardIgnores = [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      '**/logs/**',
      '**/.next/**',
      '**/build/**',
    ];
    
    // Convert gitignore patterns to glob patterns
    const gitignorePatterns = this.patterns
      .filter(p => !p.isNegated) // Chokidar doesn't support negated patterns well
      .map(p => {
        let pattern = p.pattern;
        
        // Add ** prefix and suffix for directories
        if (pattern.endsWith('/')) {
          pattern = `**/${pattern}**`;
        } else {
          pattern = `**/${pattern}`;
        }
        
        return pattern;
      });
    
    return [...standardIgnores, ...gitignorePatterns];
  }
}

// Export a factory function to create instances
export function createGitIgnoreParser(): GitIgnoreParser {
  return new GitIgnoreParser();
}
