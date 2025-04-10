import { Redis } from 'ioredis';
import { IRedisCore } from './interfaces';
import logger from '@/utils/logger';

/**
 * Core Redis service implementing basic Redis operations
 */
export class RedisCore implements IRedisCore {
  protected redis: Redis;

  /**
   * Initialize the Redis connection
   * @param redisUrl Redis connection URL
   */
  constructor(redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.redis = new Redis(redisUrl);
    logger.info('Redis connection initialized');
  }

  /**
   * Get Redis client instance
   * @returns Redis client instance
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    logger.info('Closing Redis connection');
    await this.redis.quit();
  }

  /**
   * Scan Redis for keys with a pattern and specific type
   * More efficient than using KEYS for large datasets
   * @param pattern Pattern to scan
   * @param type Optional Redis data type to filter by (hash, string, list, etc.)
   * @returns Array of matching keys
   */
  async scanKeys(
    pattern: string,
    type?: 'hash' | 'string' | 'list' | 'set' | 'zset'
  ): Promise<string[]> {
    try {
      let cursor = '0';
      const keys: string[] = [];

      do {
        // Scan with the given pattern
        const [nextCursor, matchedKeys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          '100'
        );

        cursor = nextCursor;

        // If type filtering is requested, check each key's type
        if (type && matchedKeys.length > 0) {
          for (const key of matchedKeys) {
            const keyType = await this.redis.type(key);
            if (keyType === type) {
              keys.push(key);
            }
          }
        } else {
          // No type filtering
          keys.push(...matchedKeys);
        }
      } while (cursor !== '0'); // Continue until cursor returns to 0

      return keys;
    } catch (error) {
      logger.error(`Error scanning keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Flush all data in Redis
   */
  async flushAll(): Promise<void> {
    try {
      logger.warn('Flushing all Redis data');
      await this.redis.flushall();
      logger.info('Redis data has been flushed');
    } catch (error) {
      logger.error('Error flushing Redis:', error);
      throw error;
    }
  }
}
