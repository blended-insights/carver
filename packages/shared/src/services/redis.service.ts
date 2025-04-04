import { Redis } from 'ioredis';
import { IRedisService } from '../interfaces/services.interface';
import logger from 'src/utils/logger';

/**
 * Service to handle all Redis operations
 */
export class RedisService implements IRedisService {
  private redis: Redis;
  
  constructor(redisUrl: string = process.env.REDIS_URL || "redis://localhost:6379") {
    this.redis = new Redis(redisUrl);
  }
  
  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    return this.redis;
  }
  
  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
  
  /**
   * Get all file keys for a project
   * @param projectName Project name
   */
  async getProjectFileKeys(projectName: string): Promise<string[]> {
    try {
      return await this.redis.keys(`project:${projectName}:file:*`);
    } catch (error) {
      logger.error(`Error getting file keys for project ${projectName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get file hash from Redis
   * @param projectName Project name
   * @param filePath File path
   */
  async getFileHash(projectName: string, filePath: string): Promise<string | null> {
    try {
      const fileKey = `project:${projectName}:file:${filePath}`;
      return await this.redis.hget(fileKey, "hash");
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
      const fileKey = `project:${projectName}:file:${filePath}`;
      await this.redis.del(fileKey);
    } catch (error) {
      logger.error(`Error deleting file data for ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Publish file change event to Redis
   * @param processId Process ID of the watcher
   * @param eventType Type of event (add, change, unlink)
   * @param filePath Path of the file that changed
   */
  async publishFileChange(
    processId: string, 
    eventType: 'add' | 'change' | 'unlink', 
    filePath: string
  ): Promise<void> {
    try {
      const eventData = JSON.stringify({
        processId,
        eventType,
        filePath,
        timestamp: Date.now()
      });
      
      await this.redis.publish('file.change', eventData);
    } catch (error) {
      logger.error(`Error publishing file change event for ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Publish watcher status event to Redis
   * @param processId Process ID of the watcher
   * @param status Status of the watcher
   * @param message Optional status message
   */
  async publishStatus(
    processId: string, 
    status: string, 
    message?: string
  ): Promise<void> {
    try {
      const statusData = JSON.stringify({
        processId,
        status,
        message: message || '',
        timestamp: Date.now()
      });
      
      await this.redis.publish('watcher.status', statusData);
    } catch (error) {
      logger.error(`Error publishing status event for process ${processId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const redisService = new RedisService();
export default redisService;
