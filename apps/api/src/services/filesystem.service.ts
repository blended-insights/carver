import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { IFileSystemService, FileNode } from '../interfaces/services.interface';
import logger from '../utils/logger';
import { createFileFilteringService } from '../utils/file-filtering';

/**
 * Service to handle all file system operations
 */
export class FileSystemService implements IFileSystemService {
  /**
   * Replace text in a file based on line numbers
   * @param filePath Path to the file
   * @param startLine Start line number (1-based)
   * @param endLine End line number (1-based, inclusive)
   * @param content New content to replace the lines
   * @returns Promise resolving to object with success status and updated content if successful
   */
  async replaceLinesByNumber(
    filePath: string,
    startLine: number,
    endLine: number,
    content: string
  ): Promise<{ success: boolean; content: string | null }> {
    try {
      // Read the file content
      const fileContent = this.readFileContent(filePath);

      if (fileContent === null) {
        logger.error(`File not found or cannot be read: ${filePath}`);
        return { success: false, content: null };
      }

      // Split the content into lines
      const lines =
        fileContent.split(
          '\
'
        );

      // Validate line numbers
      if (startLine < 1 || startLine > lines.length) {
        logger.error(
          `Invalid start line: ${startLine}. File has ${lines.length} lines.`
        );
        return { success: false, content: fileContent };
      }

      if (endLine < startLine || endLine > lines.length) {
        logger.error(
          `Invalid end line: ${endLine}. File has ${lines.length} lines.`
        );
        return { success: false, content: fileContent };
      }

      // JavaScript arrays are 0-indexed, but line numbers are 1-indexed
      const adjustedStartLine = startLine - 1;
      const adjustedEndLine = endLine - 1;

      // Create new content by replacing the specified lines
      const newContent = [
        ...lines.slice(0, adjustedStartLine),
        content,
        ...lines.slice(adjustedEndLine + 1),
      ].join(
        '\
'
      );

      // Write the updated content back to the file
      const writeResult = await this.writeFileContent(filePath, newContent);

      if (!writeResult) {
        logger.error(`Failed to write updated content to file ${filePath}`);
        return { success: false, content: fileContent };
      }

      logger.info(
        `Lines ${startLine}-${endLine} successfully replaced in file: ${filePath}`
      );
      return { success: true, content: newContent };
    } catch (error) {
      logger.error(`Error replacing lines in file ${filePath}:`, error);
      return { success: false, content: null };
    }
  }

  /**
   * Calculate a hash for file content
   * @param content File content
   */
  calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get all files recursively from disk
   * @param rootPath Root directory path
   */
  getAllFilesFromDisk(
    rootPath: string
  ): { relativePath: string; content: string }[] {
    const result: { relativePath: string; content: string }[] = [];

    // Initialize file filtering service
    const fileFilteringService = createFileFilteringService(rootPath);
    logger.info(`Initialized file filtering service for ${rootPath}`);

    const scanDir = (dirPath: string) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          // Get path relative to the root
          const relativePath = path.relative(rootPath, fullPath);

          if (entry.isDirectory()) {
            // Check if directory should be skipped using unified filtering
            const shouldSkip = fileFilteringService.shouldIgnorePath(
              relativePath,
              true
            );

            if (!shouldSkip) {
              scanDir(fullPath);
            } else {
              logger.debug(`Skipping directory: ${relativePath}`);
            }
          } else if (entry.isFile()) {
            try {
              // Check if file should be skipped using unified filtering
              const shouldSkip = fileFilteringService.shouldIgnorePath(
                relativePath,
                false
              );

              if (!shouldSkip) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                result.push({ relativePath, content });
              } else {
                logger.debug(`Skipping file: ${relativePath}`);
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
  listDirectories(
    dirPath: string
  ): { name: string; path: string; size: number }[] {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      // Initialize file filtering service
      const fileFilteringService = createFileFilteringService(dirPath);

      return entries
        .filter((entry) => {
          if (!entry.isDirectory()) return false;

          // Use unified filtering approach
          const relativePath = entry.name;
          return !fileFilteringService.shouldIgnorePath(relativePath, true);
        })
        .map((entry) => {
          const folderPath = path.join(dirPath, entry.name);
          return {
            name: entry.name,
            path: folderPath,
            size: this.calculateFolderSize(folderPath),
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
    return files.filter((file) =>
      ['.ts', '.tsx', '.js', '.jsx'].includes(file.extension)
    );
  }

  /**
   * Filter out files that are too large
   * @param files List of files
   * @param maxSize Maximum file size in bytes
   */
  filterLargeFiles(
    files: FileNode[],
    maxSize: number = 1024 * 1024
  ): FileNode[] {
    return files.filter((file) => {
      if (file.content.length > maxSize) {
        logger.warn(`Skipping large file: ${file.path}`);
        return false;
      }
      return true;
    });
  }

  /**
   * Check if a file exists
   * @param filePath Path to the file
   * @returns Boolean indicating if the file exists
   */
  fileExists(filePath: string): boolean {
    try {
      const stats = fs.statSync(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Read content from a file
   * @param filePath Path to the file
   * @returns File content as string or null if file doesn't exist
   */
  readFileContent(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if file is a TypeScript or JavaScript file
   * @param file File node with path and extension
   * @returns Boolean indicating if the file is a TypeScript or JavaScript file
   */
  isTypeScriptFile(file: { path: string; extension: string }): boolean {
    const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    return supportedExtensions.includes(file.extension.toLowerCase());
  }

  /**
   * Check if a file extension is supported for parsing
   * @param extension File extension
   * @returns Boolean indicating if the extension is supported
   */
  isSupportedExtension(extension: string): boolean {
    const supportedExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
      '.md',
      '.html',
      '.css',
    ];
    return supportedExtensions.includes(extension.toLowerCase());
  }

  /**
   * Write content to a file on disk asynchronously
   * @param filePath Path to the file
   * @param content Content to write
   * @returns Promise resolving to boolean indicating if the write was successful
   */
  async writeFileContent(filePath: string, content: string): Promise<boolean> {
    try {
      // Ensure the directory exists
      const directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        await fs.promises.mkdir(directory, { recursive: true });
      }

      // Write the file asynchronously
      await fs.promises.writeFile(filePath, content, 'utf-8');
      logger.info(`File successfully written: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Error writing file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Create a directory on disk asynchronously (recursively if needed)
   * @param dirPath Path to the directory to create
   * @returns Promise resolving to boolean indicating if the directory creation was successful
   */
  async createDirectory(dirPath: string): Promise<boolean> {
    try {
      // Create the directory and any needed parent directories
      if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
        logger.info(`Directory successfully created: ${dirPath}`);
      } else {
        logger.info(`Directory already exists: ${dirPath}`);
      }
      return true;
    } catch (error) {
      logger.error(`Error creating directory ${dirPath}:`, error);
      return false;
    }
  }

  /**
   * Replace text in a file on disk asynchronously
   * @param filePath Path to the file
   * @param oldText Text to be replaced
   * @param newText Text to replace with
   * @returns Promise resolving to object with success status and updated content if successful
   */
  async replaceTextInFile(
    filePath: string,
    oldText: string,
    newText: string
  ): Promise<{ success: boolean; content: string | null }> {
    try {
      // Read the file content
      const content = this.readFileContent(filePath);

      if (content === null) {
        logger.error(`File not found or cannot be read: ${filePath}`);
        return { success: false, content: null };
      }

      // Check if oldText exists in the file
      if (!content.includes(oldText)) {
        logger.warn(`Text to replace not found in file ${filePath}`);
        return { success: false, content };
      }

      // Perform replacement
      const updatedContent = content.replace(
        new RegExp(
          oldText.replace(/[.*+?^${}()|[\\\\]\\\\\\\\]/g, '\\\\\\\\$&'),
          'g'
        ),
        newText
      );

      // Write the updated content back to the file
      const writeResult = await this.writeFileContent(filePath, updatedContent);

      if (!writeResult) {
        logger.error(`Failed to write updated content to file ${filePath}`);
        return { success: false, content };
      }

      logger.info(`Text successfully replaced in file: ${filePath}`);
      return { success: true, content: updatedContent };
    } catch (error) {
      logger.error(`Error replacing text in file ${filePath}:`, error);
      return { success: false, content: null };
    }
  }
  
  /**
   * Modify file content by line numbers with operation type
   * @param filePath Path to the file
   * @param startLine Start line number (1-based)
   * @param endLine End line number (1-based, inclusive)
   * @param content New content to use (can be empty for delete operations)
   * @param operation Type of operation: 'replace', 'insert', or 'delete'
   * @returns Promise resolving to object with success status and updated content if successful
   */
  async modifyLinesByNumber(
    filePath: string,
    startLine: number,
    endLine: number,
    content: string,
    operation: 'replace' | 'insert' | 'delete'
  ): Promise<{ success: boolean; content: string | null }> {
    try {
      // Read the file content
      const fileContent = this.readFileContent(filePath);

      if (fileContent === null) {
        logger.error(`File not found or cannot be read: ${filePath}`);
        return { success: false, content: null };
      }

      // Split the content into lines
      const lines = fileContent.split('\n');

      // Validate line numbers
      if (startLine < 1 || startLine > lines.length + 1) {
        logger.error(
          `Invalid start line: ${startLine}. File has ${lines.length} lines.`
        );
        return { success: false, content: fileContent };
      }

      if (
        operation !== 'insert' &&
        (endLine < startLine || endLine > lines.length)
      ) {
        logger.error(
          `Invalid end line: ${endLine}. File has ${lines.length} lines.`
        );
        return { success: false, content: fileContent };
      }

      // JavaScript arrays are 0-indexed, but line numbers are 1-indexed
      const adjustedStartLine = startLine - 1;
      const adjustedEndLine = endLine - 1;

      let newContent: string;

      // Perform the appropriate operation
      switch (operation) {
        case 'replace':
          // Replace the specified lines with new content
          newContent = [
            ...lines.slice(0, adjustedStartLine),
            content,
            ...lines.slice(adjustedEndLine + 1),
          ].join('\n');
          break;

        case 'insert':
          // Insert new content at the specified line
          newContent = [
            ...lines.slice(0, adjustedStartLine),
            content,
            ...lines.slice(adjustedStartLine),
          ].join('\n');
          break;

        case 'delete':
          // Delete the specified lines
          newContent = [
            ...lines.slice(0, adjustedStartLine),
            ...lines.slice(adjustedEndLine + 1),
          ].join('\n');
          break;

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Write the updated content back to the file
      const writeResult = await this.writeFileContent(filePath, newContent);

      if (!writeResult) {
        logger.error(`Failed to write updated content to file ${filePath}`);
        return { success: false, content: fileContent };
      }

      logger.info(
        `Lines ${startLine}-${endLine} successfully ${operation}d in file: ${filePath}`
      );
      return { success: true, content: newContent };
    } catch (error) {
      logger.error(`Error modifying lines in file ${filePath}:`, error);
      return { success: false, content: null };
    }
  }
}

// Export singleton instance
const fileSystemService = new FileSystemService();
export default fileSystemService;
