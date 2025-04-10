import { Redis } from 'ioredis';
import { IRedisService } from './interfaces';
import { RedisCore } from './redis-core';
import { RedisFileStore } from './redis-file-store';
import { RedisPublisher } from './redis-publisher';
import logger from '@/utils/logger';

/**
 * Comprehensive Redis service
 * Combines core functionality, file storage, and event publishing
 */
export class RedisService implements IRedisService {
  private core: RedisCore;
  private fileStore: RedisFileStore;
  private publisher: RedisPublisher;

  /**
   * Initialize the Redis service components
   * @param redisUrl Redis connection URL
   */
  constructor(redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {
    // For simplicity in this refactoring, each component creates its own Redis connection
    // In a production environment, we might want to share a single connection
    this.core = new RedisCore(redisUrl);
    this.fileStore = new RedisFileStore(redisUrl);
    this.publisher = new RedisPublisher(redisUrl);
    
    logger.info('Redis service initialized with all components');
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    return this.core.getClient();
  }

  /**
   * Close all Redis connections
   */
  async close(): Promise<void> {
    // Close all component connections
    await this.core.close();
    await this.fileStore.close();
    await this.publisher.close();
    
    logger.info('All Redis connections closed');
  }

  /**
   * Scan Redis for keys with a pattern and specific type
   */
  scanKeys(
    pattern: string,
    type?: 'hash' | 'string' | 'list' | 'set' | 'zset'
  ): Promise<string[]> {
    return this.core.scanKeys(pattern, type);
  }

  /**
   * Flush all data in Redis
   */
  async flushAll(): Promise<void> {
    // Use the publisher's flushAll which also sends a notification
    await this.publisher.flushAll();
  }

  /**
   * Get all file keys for a project
   */
  getProjectFileKeys(projectName: string): Promise<string[]> {
    return this.fileStore.getProjectFileKeys(projectName);
  }

  /**
   * Get all unique files for a project from Redis
   */
  getProjectFiles(
    projectName: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    return this.fileStore.getProjectFiles(projectName);
  }

  /**
   * Get a specific file with selected fields from Redis
   */
  getProjectFile(
    projectName: string,
    filePath: string,
    fields?: string[]
  ): Promise<Record<string, string> | null> {
    return this.fileStore.getProjectFile(projectName, filePath, fields);
  }

  /**
   * Get file hash from Redis
   */
  getFileHash(
    projectName: string,
    filePath: string
  ): Promise<string | null> {
    return this.fileStore.getFileHash(projectName, filePath);
  }

  /**
   * Store file data in Redis
   */
  storeFileData(
    projectName: string,
    filePath: string,
    content: string,
    hash: string
  ): Promise<void> {
    return this.fileStore.storeFileData(projectName, filePath, content, hash);
  }

  /**
   * Delete file data from Redis
   */
  deleteFileData(projectName: string, filePath: string): Promise<void> {
    return this.fileStore.deleteFileData(projectName, filePath);
  }

  /**
   * Publish file change event to Redis
   */
  publishFileChange(
    processId: string,
    eventType: 'add' | 'change' | 'unlink',
    filePath: string
  ): Promise<void> {
    return this.publisher.publishFileChange(processId, eventType, filePath);
  }

  /**
   * Publish watcher status event to Redis
   */
  publishStatus(
    processId: string,
    status: string,
    message?: string
  ): Promise<void> {
    return this.publisher.publishStatus(processId, status, message);
  }

  /**
   * Publish a system event
   * Additional method not in the interface
   */
  publishSystemEvent(eventType: string, message: string): Promise<void> {
    return this.publisher.publishSystemEvent(eventType, message);
  }
}
