import { RedisService } from './redis.service';

// Create a singleton instance
const redisService = new RedisService();

// Export the singleton instance as default
export default redisService;

// Re-export everything else for use throughout the application
export * from './interfaces';
export * from './redis-core';
export * from './redis-file-store';
export * from './redis-publisher';
export * from './redis.service';
