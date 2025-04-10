import { seederService } from '../seeder';
import { WatcherManager } from './watcher-manager';
import { ISeederFunction } from './interfaces';

// Create a singleton instance of the WatcherManager with the seeder service
export const watcherManager = new WatcherManager(
  seederService.seedGraphForFolder.bind(seederService) as ISeederFunction
);

// Re-export the interfaces and classes
export * from './interfaces';
export * from './watcher-manager';
export * from './watcher-config';
export * from './event-handler';
