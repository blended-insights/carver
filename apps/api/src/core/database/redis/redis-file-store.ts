import { IRedisFileStore } from './interfaces';
import { RedisCore } from './redis-core';
import logger from '@/utils/logger';

/**
 * Redis service for file storage operations
 * Manages storing, retrieving, and deleting file data
 */
export class RedisFileStore extends RedisCore implements IRedisFileStore {
  /**
   * Get all file keys for a project
   * @param projectName Project name
   * @returns Array of Redis keys for project files
   */
  async getProjectFileKeys(projectName: string): Promise<string[]> {
    try {
      logger.debug(`Getting file keys for project: ${projectName}`);
      // Use the more efficient scanKeys method instead of keys with type=hash
      return await this.scanKeys(`project:${projectName}:file:*`, 'hash');
    } catch (error) {
      logger.error(
        `Error getting file keys for project ${projectName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all unique files for a project from Redis
   * @param projectName Project name
   * @returns Array of file objects with path, name, and extension
   */
  async getProjectFiles(
    projectName: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    try {
      logger.debug(`Getting files for project: ${projectName}`);
      // Get all file keys for the project using scan with type=hash
      const keys = await this.scanKeys(`project:${projectName}:file:*`, 'hash');

      if (!keys || keys.length === 0) {
        return [];
      }

      // Extract file paths from keys and transform them into file objects
      const files = keys.map((key) => {
        // Extract the file path from the key
        // Format: project:${projectName}:file:${filePath}
        const filePath = key.replace(`project:${projectName}:file:`, '');

        // Extract file name and extension
        const fileName = filePath.split('/').pop() || '';
        const dotIndex = fileName.lastIndexOf('.');
        const extension = dotIndex !== -1 ? fileName.substring(dotIndex) : '';

        return {
          path: filePath,
          name: fileName,
          extension,
        };
      });

      return files;
    } catch (error) {
      logger.error(`Error getting files for project ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific file with selected fields from Redis
   * @param projectName Project name
   * @param filePath File path
   * @param fields Array of fields to return (content, hash, lastModified)
   * @returns Object containing the requested file fields or null if not found
   */
  async getProjectFile(
    projectName: string,
    filePath: string,
    fields: string[] = ['content', 'hash', 'lastModified']
  ): Promise<Record<string, string> | null> {
    logger.debug(
      `Getting file data for ${filePath} in project ${projectName} with fields: ${fields.join(
        ', '
      )}`
    );
    try {
      const fileKey = `project:${projectName}:file:${filePath}`;

      // Check if the file exists
      const exists = await this.redis.exists(fileKey);
      if (!exists) {
        return null;
      }

      // Get only the requested fields
      const fileData = await this.redis.hmget(fileKey, ...fields);

      // Convert array of values to key-value object
      const result: Record<string, string> = {};
      fields.forEach((field, index) => {
        if (fileData[index]) {
          result[field] = fileData[index];
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error getting file data for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get file hash from Redis
   * @param projectName Project name
   * @param filePath File path
   * @returns File hash or null if not found
   */
  async getFileHash(
    projectName: string,
    filePath: string
  ): Promise<string | null> {
    try {
      logger.debug(`Getting file hash for ${filePath} in project ${projectName}`);
      const fileKey = `project:${projectName}:file:${filePath}`;
      return await this.redis.hget(fileKey, 'hash');
    } catch (error) {
      logger.error(`Error getting file hash for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Store file data in Redis
   * @param projectName Project name
   * @param filePath File path
   * @param content File content
   * @param hash File hash
   */
  async storeFileData(
    projectName: string,
    filePath: string,
    content: string,
    hash: string
  ): Promise<void> {
    try {
      logger.debug(`Storing file data for ${filePath} in project ${projectName}`);
      const fileKey = `project:${projectName}:file:${filePath}`;
      await this.redis.hset(fileKey, {
        content,
        hash,
        lastModified: Date.now().toString(),
      });
    } catch (error) {
      logger.error(`Error storing file data for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Delete file data from Redis
   * @param projectName Project name
   * @param filePath File path
   */
  async deleteFileData(projectName: string, filePath: string): Promise<void> {
    try {
      logger.debug(`Deleting file data for ${filePath} in project ${projectName}`);
      const fileKey = `project:${projectName}:file:${filePath}`;
      await this.redis.del(fileKey);
    } catch (error) {
      logger.error(`Error deleting file data for ${filePath}:`, error);
      throw error;
    }
  }
}
