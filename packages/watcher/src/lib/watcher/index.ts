import { WatcherManager, type ISeederFunction } from '@carver/shared';
import { seedGraphForFolder } from '../seeder';

// Create a new watcher manager with the seeder function
const watcherManager = new WatcherManager(seedGraphForFolder as ISeederFunction);
export default watcherManager;
