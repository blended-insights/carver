import { Redis } from 'ioredis';
import { RedisService } from '../services/redis.service';
import logger from '@/utils/logger';

// Mock ioredis
jest.mock('ioredis');
jest.mock('@/utils/logger');

describe('RedisService', () => {
  let redisService: RedisService;
  let mockRedis: jest.Mocked<Redis>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Redis instance
    mockRedis = {
      quit: jest.fn().mockResolvedValue(true),
      keys: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      del: jest.fn(),
      publish: jest.fn()
    } as unknown as jest.Mocked<Redis>;
    
    // Mock Redis constructor
    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);
    
    // Create RedisService instance
    redisService = new RedisService('redis://localhost:6379');
  });
  
  describe('constructor', () => {
    it('should initialize Redis client with default URL', () => {
      const defaultRedisService = new RedisService();
      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379');
    });
    
    it('should initialize Redis client with provided URL', () => {
      const customRedisService = new RedisService('redis://custom:6379');
      expect(Redis).toHaveBeenCalledWith('redis://custom:6379');
    });
  });
  
  describe('getClient', () => {
    it('should return Redis client instance', () => {
      const client = redisService.getClient();
      expect(client).toBe(mockRedis);
    });
  });
  
  describe('close', () => {
    it('should close Redis connection', async () => {
      await redisService.close();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
  
  describe('getProjectFileKeys', () => {
    it('should get file keys for a project', async () => {
      const projectName = 'test-project';
      const expectedKeys = ['project:test-project:file:file1.ts', 'project:test-project:file:file2.ts'];
      
      mockRedis.keys.mockResolvedValue(expectedKeys);
      
      const result = await redisService.getProjectFileKeys(projectName);
      
      expect(result).toEqual(expectedKeys);
      expect(mockRedis.keys).toHaveBeenCalledWith('project:test-project:file:*');
    });
    
    it('should handle error when getting file keys', async () => {
      const projectName = 'test-project';
      const error = new Error('Redis error');
      
      mockRedis.keys.mockRejectedValue(error);
      
      await expect(redisService.getProjectFileKeys(projectName)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('getFileHash', () => {
    it('should get file hash from Redis', async () => {
      const projectName = 'test-project';
      const filePath = 'path/to/file.ts';
      const expectedHash = '1234567890abcdef';
      
      mockRedis.hget.mockResolvedValue(expectedHash);
      
      const result = await redisService.getFileHash(projectName, filePath);
      
      expect(result).toEqual(expectedHash);
      expect(mockRedis.hget).toHaveBeenCalledWith('project:test-project:file:path/to/file.ts', 'hash');
    });
    
    it('should handle error when getting file hash', async () => {
      const projectName = 'test-project';
      const filePath = 'path/to/file.ts';
      const error = new Error('Redis error');
      
      mockRedis.hget.mockRejectedValue(error);
      
      await expect(redisService.getFileHash(projectName, filePath)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('storeFileData', () => {
    it('should store file data in Redis', async () => {
      const projectName = 'test-project';
      const filePath = 'path/to/file.ts';
      const content = 'file content';
      const hash = '1234567890abcdef';
      
      // Mock Date.now() to return a consistent value for testing
      const originalDateNow = Date.now;
      const mockTimestamp = 1600000000000;
      global.Date.now = jest.fn(() => mockTimestamp);
      
      mockRedis.hset.mockResolvedValue(1);
      
      await redisService.storeFileData(projectName, filePath, content, hash);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'project:test-project:file:path/to/file.ts',
        {
          content,
          hash,
          lastModified: mockTimestamp.toString(),
        }
      );
      
      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
    
    it('should handle error when storing file data', async () => {
      const projectName = 'test-project';
      const filePath = 'path/to/file.ts';
      const content = 'file content';
      const hash = '1234567890abcdef';
      const error = new Error('Redis error');
      
      mockRedis.hset.mockRejectedValue(error);
      
      await expect(redisService.storeFileData(projectName, filePath, content, hash)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('deleteFileData', () => {
    it('should delete file data from Redis', async () => {
      const projectName = 'test-project';
      const filePath = 'path/to/file.ts';
      
      mockRedis.del.mockResolvedValue(1);
      
      await redisService.deleteFileData(projectName, filePath);
      
      expect(mockRedis.del).toHaveBeenCalledWith('project:test-project:file:path/to/file.ts');
    });
    
    it('should handle error when deleting file data', async () => {
      const projectName = 'test-project';
      const filePath = 'path/to/file.ts';
      const error = new Error('Redis error');
      
      mockRedis.del.mockRejectedValue(error);
      
      await expect(redisService.deleteFileData(projectName, filePath)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('publishFileChange', () => {
    it('should publish file change event to Redis', async () => {
      const processId = 'watcher-123';
      const eventType = 'add';
      const filePath = 'path/to/file.ts';
      
      // Mock Date.now() to return a consistent value for testing
      const originalDateNow = Date.now;
      const mockTimestamp = 1600000000000;
      global.Date.now = jest.fn(() => mockTimestamp);
      
      mockRedis.publish.mockResolvedValue(1);
      
      await redisService.publishFileChange(processId, eventType, filePath);
      
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'file.change',
        JSON.stringify({
          processId,
          eventType,
          filePath,
          timestamp: mockTimestamp
        })
      );
      
      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
    
    it('should handle error when publishing file change event', async () => {
      const processId = 'watcher-123';
      const eventType = 'add';
      const filePath = 'path/to/file.ts';
      const error = new Error('Redis error');
      
      mockRedis.publish.mockRejectedValue(error);
      
      await expect(redisService.publishFileChange(processId, eventType, filePath)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('publishStatus', () => {
    it('should publish status event to Redis', async () => {
      const processId = 'watcher-123';
      const status = 'started';
      const message = 'Watcher started successfully';
      
      // Mock Date.now() to return a consistent value for testing
      const originalDateNow = Date.now;
      const mockTimestamp = 1600000000000;
      global.Date.now = jest.fn(() => mockTimestamp);
      
      mockRedis.publish.mockResolvedValue(1);
      
      await redisService.publishStatus(processId, status, message);
      
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'watcher.status',
        JSON.stringify({
          processId,
          status,
          message,
          timestamp: mockTimestamp
        })
      );
      
      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
    
    it('should use empty string as default message', async () => {
      const processId = 'watcher-123';
      const status = 'started';
      
      // Mock Date.now() to return a consistent value for testing
      const originalDateNow = Date.now;
      const mockTimestamp = 1600000000000;
      global.Date.now = jest.fn(() => mockTimestamp);
      
      mockRedis.publish.mockResolvedValue(1);
      
      await redisService.publishStatus(processId, status);
      
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'watcher.status',
        JSON.stringify({
          processId,
          status,
          message: '',
          timestamp: mockTimestamp
        })
      );
      
      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
    
    it('should handle error when publishing status event', async () => {
      const processId = 'watcher-123';
      const status = 'started';
      const message = 'Watcher started successfully';
      const error = new Error('Redis error');
      
      mockRedis.publish.mockRejectedValue(error);
      
      await expect(redisService.publishStatus(processId, status, message)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
