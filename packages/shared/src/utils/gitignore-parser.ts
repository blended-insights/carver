import * as fs from 'fs';
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
  getDefaultDirExclusions(): ((path: string) => boolean)[] {
    return [
      (path: string) => {
        const name = path.split('/').pop() || '';
        return name.startsWith(".") && name !== ".nx";
      },
      (path: string) => path.includes("/node_modules/") || path.endsWith("/node_modules"),
      (path: string) => path.includes("/coverage/") || path.endsWith("/coverage"),
      (path: string) => path.includes("/dist/") || path.endsWith("/dist"),
      (path: string) => path.includes("/docs/") || path.endsWith("/docs"),
      (path: string) => path.includes("/logs/") || path.endsWith("/logs"),
      (path: string) => path.includes("/build/") || path.endsWith("/build"),
      (path: string) => path.includes("/.next/") || path.endsWith("/.next"),
    ];
  }

  /**
   * Get default file exclusions
   * @returns Array of test functions for default file exclusions
   */
  getDefaultFileExclusions(): ((path: string) => boolean)[] {
    return [
      (path: string) => {
        const name = path.split('/').pop() || '';
        return name === ".DS_Store";
      },
      (path: string) => {
        const name = path.split('/').pop() || '';
        return name.startsWith(".env");
      },
      (path: string) => path.endsWith(".log"),
      (path: string) => path.endsWith(".pem"),
      (path: string) => path.endsWith(".tsbuildinfo"),
      (path: string) => path.endsWith(".hash"),
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
        
        // Handle patterns with path separators specifically
        if (pattern.includes('/')) {
          // If it already has path separators, make sure it has ** at start and end if needed
          if (!pattern.startsWith('/')) {
            pattern = `**/${pattern}`;
          } else {
            // Remove leading slash since chokidar is relative to the root
            pattern = pattern.substring(1);
          }
          
          // Add trailing ** if it ends with a slash (for directories)
          if (pattern.endsWith('/')) {
            pattern = `${pattern}**`;
          } else if (!pattern.includes('*')) {
            // For specific paths without wildcards, add ** to match files within
            pattern = `${pattern}/**`;
          }
        } else {
          // Simple file/dir name patterns (no path separators)
          pattern = `**/${pattern}`;
          
          // Add trailing ** for directories
          if (pattern.endsWith('/')) {
            pattern = `${pattern}**`;
          }
        }
        
        return pattern;
      });
    
    logger.info(`Converted gitignore patterns to chokidar patterns: ${[...standardIgnores, ...gitignorePatterns].join(', ')}`);
    
    return [...standardIgnores, ...gitignorePatterns];
  }
}

// Export a factory function to create instances
export function createGitIgnoreParser(): GitIgnoreParser {
  return new GitIgnoreParser();
}
