import { IRedisPublisher } from './interfaces';
import { RedisCore } from './redis-core';
import logger from '@/utils/logger';

/**
 * Redis service for publishing events
 * Handles status updates and file change notifications
 */
export class RedisPublisher extends RedisCore implements IRedisPublisher {
  // Channel names
  private readonly FILE_CHANGE_CHANNEL = 'file.change';
  private readonly WATCHER_STATUS_CHANNEL = 'watcher.status';

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
      logger.debug(
        `Publishing ${eventType} event for file: ${filePath} (process: ${processId})`
      );
      const eventData = JSON.stringify({
        processId,
        eventType,
        filePath,
        timestamp: Date.now(),
      });

      await this.redis.publish(this.FILE_CHANGE_CHANNEL, eventData);
    } catch (error) {
      logger.error(
        `Error publishing file change event for ${filePath}:`,
        error
      );
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
      logger.debug(
        `Publishing status update for process ${processId}: ${status}`
      );
      const statusData = JSON.stringify({
        processId,
        status,
        message: message || '',
        timestamp: Date.now(),
      });

      await this.redis.publish(this.WATCHER_STATUS_CHANNEL, statusData);
    } catch (error) {
      logger.error(
        `Error publishing status event for process ${processId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Publish system event
   * @param eventType Type of system event
   * @param message Event message
   */
  async publishSystemEvent(eventType: string, message: string): Promise<void> {
    try {
      logger.debug(`Publishing system event: ${eventType}`);
      const eventData = JSON.stringify({
        processId: 'system',
        status: eventType,
        message,
        timestamp: Date.now(),
      });

      await this.redis.publish(this.WATCHER_STATUS_CHANNEL, eventData);
    } catch (error) {
      logger.error(`Error publishing system event (${eventType}):`, error);
      throw error;
    }
  }

  /**
   * Override flushAll to publish a notification when Redis is flushed
   */
  override async flushAll(): Promise<void> {
    try {
      // Call the parent method to flush Redis
      await super.flushAll();

      // Publish a status event to notify clients that Redis has been flushed
      await this.publishSystemEvent(
        'redis-flushed',
        'Redis database has been cleared'
      );
    } catch (error) {
      logger.error('Error in flushAll with notification:', error);
      throw error;
    }
  }
}
