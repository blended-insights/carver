import { neo4jService } from '@/core/database/neo4j';
import redisService from '@/core/database/redis';
import fileSystemService from './filesystem.service';
import gitVersionManagerFactory from './git-versioning/factory';
import { GitVersionManager } from './git-versioning';
import queueService from './queue/queue.service';
import { seederService } from './seeder';
import { watcherManager } from './watcher';
import { ISeederFunction, IWatcherManager } from './watcher/interfaces';

export {
  neo4jService,
  redisService,
  fileSystemService,
  queueService,
  watcherManager,
  type ISeederFunction,
  type IWatcherManager,
  gitVersionManagerFactory,
  GitVersionManager,
  seederService,
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

  // Clean up watchers
  await watcherManager.cleanup();

  // Clean up git version managers
  gitVersionManagerFactory.cleanup();
}
