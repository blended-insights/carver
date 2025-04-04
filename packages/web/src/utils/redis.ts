import Redis from 'ioredis';
import logger from './logger';

// Types for Redis event notifications
export interface WatcherStatusNotification {
  processId: string;
  status: 'started' | 'running' | 'error' | 'shutdown';
  message: string;
  timestamp: number;
}

export interface FileChangeNotification {
  processId: string;
  eventType: 'add' | 'change' | 'unlink';
  filePath: string;
  timestamp: number;
}

// Redis client configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a Redis client
export const createRedisClient = () => {
  try {
    const client = new Redis(REDIS_URL);
    
    client.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
    
    client.on('connect', () => {
      logger.info('Redis connected successfully');
    });
    
    return client;
  } catch (error) {
    logger.error('Failed to create Redis client:', error);
    throw error;
  }
};

// Subscribe to watcher status channel
export const subscribeToWatcherStatus = (
  callback: (notification: WatcherStatusNotification) => void
) => {
  try {
    const subscriber = createRedisClient();
    
    subscriber.subscribe('watcher.status', (err) => {
      if (err) {
        logger.error('Failed to subscribe to watcher.status channel:', err);
        return;
      }
      
      logger.info('Subscribed to watcher.status channel');
    });
    
    subscriber.on('message', (channel, message) => {
      if (channel === 'watcher.status') {
        try {
          const notification = JSON.parse(message) as WatcherStatusNotification;
          callback(notification);
        } catch (parseErr) {
          logger.error('Error parsing watcher.status message:', parseErr);
        }
      }
    });
    
    return subscriber;
  } catch (error) {
    logger.error('Error setting up watcher.status subscription:', error);
    throw error;
  }
};

// Subscribe to file change channel
export const subscribeToFileChanges = (
  callback: (notification: FileChangeNotification) => void
) => {
  try {
    const subscriber = createRedisClient();
    
    subscriber.subscribe('file.change', (err) => {
      if (err) {
        logger.error('Failed to subscribe to file.change channel:', err);
        return;
      }
      
      logger.info('Subscribed to file.change channel');
    });
    
    subscriber.on('message', (channel, message) => {
      if (channel === 'file.change') {
        try {
          const notification = JSON.parse(message) as FileChangeNotification;
          callback(notification);
        } catch (parseErr) {
          logger.error('Error parsing file.change message:', parseErr);
        }
      }
    });
    
    return subscriber;
  } catch (error) {
    logger.error('Error setting up file.change subscription:', error);
    throw error;
  }
};
