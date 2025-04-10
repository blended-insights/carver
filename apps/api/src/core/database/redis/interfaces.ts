import { Redis } from 'ioredis';

/**
 * Interface for core Redis operations
 */
export interface IRedisCore {
  /**
   * Get Redis client instance
   */
  getClient(): Redis;

  /**
   * Close Redis connection
   */
  close(): Promise<void>;

  /**
   * Scan Redis for keys with a pattern and specific type
   * @param pattern Pattern to scan
   * @param type Optional Redis data type to filter by
   */
  scanKeys(
    pattern: string,
    type?: 'hash' | 'string' | 'list' | 'set' | 'zset'
  ): Promise<string[]>;

  /**
   * Flush all data in Redis
   */
  flushAll(): Promise<void>;
}

/**
 * Interface for file-related Redis operations
 */
export interface IRedisFileStore {
  /**
   * Get all file keys for a project
   * @param projectName Project name
   */
  getProjectFileKeys(projectName: string): Promise<string[]>;

  /**
   * Get all unique files for a project from Redis
   * @param projectName Project name
   */
  getProjectFiles(
    projectName: string
  ): Promise<{ path: string; name: string; extension: string }[]>;

  /**
   * Get a specific file with selected fields from Redis
   * @param projectName Project name
   * @param filePath File path
   * @param fields Array of fields to return
   */
  getProjectFile(
    projectName: string,
    filePath: string,
    fields?: string[]
  ): Promise<Record<string, string> | null>;

  /**
   * Get file hash from Redis
   * @param projectName Project name
   * @param filePath File path
   */
  getFileHash(projectName: string, filePath: string): Promise<string | null>;

  /**
   * Store file data in Redis
   * @param projectName Project name
   * @param filePath File path
   * @param content File content
   * @param hash File hash
   */
  storeFileData(
    projectName: string,
    filePath: string,
    content: string,
    hash: string
  ): Promise<void>;

  /**
   * Delete file data from Redis
   * @param projectName Project name
   * @param filePath File path
   */
  deleteFileData(projectName: string, filePath: string): Promise<void>;
}

/**
 * Interface for event publishing operations
 */
export interface IRedisPublisher {
  /**
   * Publish file change event to Redis
   * @param processId Process ID of the watcher
   * @param eventType Type of event (add, change, unlink)
   * @param filePath Path of the file that changed
   */
  publishFileChange(
    processId: string, 
    eventType: 'add' | 'change' | 'unlink',
    filePath: string
  ): Promise<void>;

  /**
   * Publish watcher status event to Redis
   * @param processId Process ID of the watcher
   * @param status Status of the watcher
   * @param message Optional status message
   */
  publishStatus(
    processId: string,
    status: string,
    message?: string
  ): Promise<void>;
}

/**
 * Combined interface for the Redis service
 */
export interface IRedisService extends IRedisCore, IRedisFileStore, IRedisPublisher {}
