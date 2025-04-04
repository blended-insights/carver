import neo4jService from './neo4j.service';
import redisService from './redis.service';
import fileSystemService from './filesystem.service';
import { WatcherManager, type ISeederFunction } from './watcher.service';

export {
  neo4jService,
  redisService,
  fileSystemService,
  WatcherManager,
  ISeederFunction
};

/**
 * Initialize all services
 */
export async function initializeServices(): Promise<void> {
  // Any initialization logic for services can go here
  // This allows us to ensure services are properly set up before the app starts
}

/**
 * Cleanup all services
 */
export async function cleanupServices(): Promise<void> {
  // Close connections
  await neo4jService.close();
  await redisService.close();
}
