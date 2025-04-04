import * as chokidar from 'chokidar';
import { WatcherManager } from '../lib/watcher/index';
import { redisService, fileSystemService } from '@/services';
import { seedGraphForFolder } from '@/lib/seeder';
import logger from '@/utils/logger';

// Mock dependencies
jest.mock('chokidar');
jest.mock('@/services');
jest.mock('@/lib/seeder');
jest.mock('@/utils/logger');

describe('WatcherManager', () => {
  let watcherManager: WatcherManager;
  let mockWatcher: jest.Mocked<chokidar.FSWatcher>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock watcher
    mockWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
      getWatched: jest.fn().mockReturnValue({ '/path/to/folder': ['file1.ts'] })
    } as unknown as jest.Mocked<chokidar.FSWatcher>;
    
    // Mock chokidar.watch
    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);
    
    // Mock fileSystemService.directoryExists
    (fileSystemService.directoryExists as jest.Mock).mockReturnValue(true);
    
    // Mock seedGraphForFolder
    (seedGraphForFolder as jest.Mock).mockResolvedValue({ success: true, message: 'Success' });
    
    // Create WatcherManager instance
    watcherManager = new WatcherManager();
  });
  
  describe('startWatcher', () => {
    it('should start a file watcher for a folder', async () => {
      const folderPath = '/path/to/folder';
      const projectName = 'test-project';
      
      const processId = await watcherManager.startWatcher(folderPath, projectName);
      
      // Verify processId format
      expect(processId).toMatch(/^watcher-\d+-[a-z0-9]+$/);
      
      // Verify directory check
      expect(fileSystemService.directoryExists).toHaveBeenCalledWith(folderPath);
      
      // Verify Redis status publications
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'seeding',
        expect.any(String)
      );
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'seeded',
        expect.any(String)
      );
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'started',
        expect.any(String)
      );
      
      // Verify graph seeding
      expect(seedGraphForFolder).toHaveBeenCalledWith({
        root: folderPath,
        project: projectName
      });
      
      // Verify chokidar watch
      expect(chokidar.watch).toHaveBeenCalledWith(
        folderPath,
        expect.objectContaining({
          ignored: expect.any(Array),
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: expect.any(Object)
        })
      );
      
      // Verify event handlers
      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      // Verify watcher is stored
      const activeWatchers = watcherManager.getActiveWatchers();
      expect(activeWatchers).toHaveLength(1);
      expect(activeWatchers[0]).toEqual({
        processId,
        folderPath,
        projectName
      });
    });
    
    it('should throw error if directory does not exist', async () => {
      const folderPath = '/path/to/nonexistent';
      const projectName = 'test-project';
      
      (fileSystemService.directoryExists as jest.Mock).mockReturnValue(false);
      
      await expect(watcherManager.startWatcher(folderPath, projectName)).rejects.toThrow(
        'Directory does not exist'
      );
      
      expect(fileSystemService.directoryExists).toHaveBeenCalledWith(folderPath);
      expect(chokidar.watch).not.toHaveBeenCalled();
      expect(seedGraphForFolder).not.toHaveBeenCalled();
    });
    
    it('should throw error if graph seeding fails', async () => {
      const folderPath = '/path/to/folder';
      const projectName = 'test-project';
      
      (seedGraphForFolder as jest.Mock).mockResolvedValue({ 
        success: false, 
        message: 'Seeding failed' 
      });
      
      await expect(watcherManager.startWatcher(folderPath, projectName)).rejects.toThrow(
        'Failed to seed graph'
      );
      
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        expect.any(String),
        'error',
        expect.stringContaining('Failed to seed graph')
      );
      expect(chokidar.watch).not.toHaveBeenCalled();
    });
  });
  
  describe('restartWatcher', () => {
    it('should restart an existing watcher', async () => {
      // First start a watcher
      const folderPath = '/path/to/folder';
      const projectName = 'test-project';
      const processId = await watcherManager.startWatcher(folderPath, projectName);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Restart the watcher
      const result = await watcherManager.restartWatcher(processId);
      
      expect(result).toBe(true);
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'restarting',
        expect.any(String)
      );
      expect(chokidar.watch).toHaveBeenCalledWith(
        folderPath,
        expect.any(Object)
      );
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'restarted',
        expect.any(String)
      );
    });
    
    it('should return false if watcher does not exist', async () => {
      const nonexistentProcessId = 'watcher-nonexistent';
      
      const result = await watcherManager.restartWatcher(nonexistentProcessId);
      
      expect(result).toBe(false);
      expect(mockWatcher.close).not.toHaveBeenCalled();
      expect(redisService.publishStatus).not.toHaveBeenCalled();
      expect(chokidar.watch).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should handle error during restart', async () => {
      // First start a watcher
      const folderPath = '/path/to/folder';
      const projectName = 'test-project';
      const processId = await watcherManager.startWatcher(folderPath, projectName);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Mock error during close
      const error = new Error('Close error');
      mockWatcher.close.mockRejectedValueOnce(error);
      
      const result = await watcherManager.restartWatcher(processId);
      
      expect(result).toBe(false);
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'error',
        expect.stringContaining('Failed to restart watcher')
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('killWatcher', () => {
    it('should kill an existing watcher', async () => {
      // First start a watcher
      const folderPath = '/path/to/folder';
      const projectName = 'test-project';
      const processId = await watcherManager.startWatcher(folderPath, projectName);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Kill the watcher
      const result = await watcherManager.killWatcher(processId);
      
      expect(result).toBe(true);
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'killed',
        expect.any(String)
      );
      
      // Verify watcher is removed
      const activeWatchers = watcherManager.getActiveWatchers();
      expect(activeWatchers).toHaveLength(0);
    });
    
    it('should return false if watcher does not exist', async () => {
      const nonexistentProcessId = 'watcher-nonexistent';
      
      const result = await watcherManager.killWatcher(nonexistentProcessId);
      
      expect(result).toBe(false);
      expect(mockWatcher.close).not.toHaveBeenCalled();
      expect(redisService.publishStatus).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should handle error during kill', async () => {
      // First start a watcher
      const folderPath = '/path/to/folder';
      const projectName = 'test-project';
      const processId = await watcherManager.startWatcher(folderPath, projectName);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Mock error during close
      const error = new Error('Close error');
      mockWatcher.close.mockRejectedValueOnce(error);
      
      const result = await watcherManager.killWatcher(processId);
      
      expect(result).toBe(false);
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        processId,
        'error',
        expect.stringContaining('Failed to kill watcher')
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('getActiveWatchers', () => {
    it('should return all active watchers', async () => {
      // Start multiple watchers
      const folder1 = '/path/to/folder1';
      const project1 = 'project1';
      const folder2 = '/path/to/folder2';
      const project2 = 'project2';
      
      const processId1 = await watcherManager.startWatcher(folder1, project1);
      const processId2 = await watcherManager.startWatcher(folder2, project2);
      
      const activeWatchers = watcherManager.getActiveWatchers();
      
      expect(activeWatchers).toHaveLength(2);
      expect(activeWatchers).toEqual(expect.arrayContaining([
        {
          processId: processId1,
          folderPath: folder1,
          projectName: project1
        },
        {
          processId: processId2,
          folderPath: folder2,
          projectName: project2
        }
      ]));
    });
    
    it('should return empty array if no watchers are active', () => {
      const activeWatchers = watcherManager.getActiveWatchers();
      
      expect(activeWatchers).toHaveLength(0);
      expect(activeWatchers).toEqual([]);
    });
  });
  
  describe('getActiveWatcherIds', () => {
    it('should return IDs of all active watchers', async () => {
      // Start multiple watchers
      const folder1 = '/path/to/folder1';
      const project1 = 'project1';
      const folder2 = '/path/to/folder2';
      const project2 = 'project2';
      
      const processId1 = await watcherManager.startWatcher(folder1, project1);
      const processId2 = await watcherManager.startWatcher(folder2, project2);
      
      const activeWatcherIds = watcherManager.getActiveWatcherIds();
      
      expect(activeWatcherIds).toHaveLength(2);
      expect(activeWatcherIds).toEqual(expect.arrayContaining([processId1, processId2]));
    });
    
    it('should return empty array if no watchers are active', () => {
      const activeWatcherIds = watcherManager.getActiveWatcherIds();
      
      expect(activeWatcherIds).toHaveLength(0);
      expect(activeWatcherIds).toEqual([]);
    });
  });
  
  describe('cleanup', () => {
    it('should clean up all watchers', async () => {
      // Start multiple watchers
      const folder1 = '/path/to/folder1';
      const project1 = 'project1';
      const folder2 = '/path/to/folder2';
      const project2 = 'project2';
      
      const processId1 = await watcherManager.startWatcher(folder1, project1);
      const processId2 = await watcherManager.startWatcher(folder2, project2);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Cleanup
      await watcherManager.cleanup();
      
      expect(mockWatcher.close).toHaveBeenCalledTimes(2);
      expect(redisService.publishStatus).toHaveBeenCalledWith(
        expect.any(String),
        'shutdown',
        expect.any(String)
      );
      
      // Verify all watchers are removed
      const activeWatchers = watcherManager.getActiveWatchers();
      expect(activeWatchers).toHaveLength(0);
    });
    
    it('should handle errors during cleanup', async () => {
      // Start a watcher
      const folderPath = '/path/to/folder';
      const projectName = 'test-project';
      await watcherManager.startWatcher(folderPath, projectName);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Mock error during close
      const error = new Error('Close error');
      mockWatcher.close.mockRejectedValueOnce(error);
      
      // Cleanup
      await watcherManager.cleanup();
      
      // Should still complete despite error
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      
      // Verify all watchers are removed
      const activeWatchers = watcherManager.getActiveWatchers();
      expect(activeWatchers).toHaveLength(0);
    });
  });
});
