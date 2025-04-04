import * as neo4j from 'neo4j-driver';
import { Neo4jService } from '@carver/shared';

// Mock neo4j driver
jest.mock('neo4j-driver');

// Mock the console logger used in the shared package
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('Neo4jService', () => {
  let neo4jService: Neo4jService;
  let mockDriver: jest.Mocked<neo4j.Driver>;
  let mockSession: jest.Mocked<neo4j.Session>;
  let mockResult: jest.Mocked<neo4j.Result>;
  
  // Setup environment variables for tests
  const originalEnv = process.env;
  
  beforeAll(() => {
    process.env.NEO4J_URI = 'neo4j://localhost:7687';
    process.env.NEO4J_USERNAME = 'neo4j';
    process.env.NEO4J_PASSWORD = 'password';
  });
  
  afterAll(() => {
    process.env = originalEnv;
    global.console = originalConsole;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Result
    mockResult = {
      records: [],
      summary: {} as any
    } as unknown as jest.Mocked<neo4j.Result>;
    
    // Create mock Session
    mockSession = {
      run: jest.fn().mockResolvedValue(mockResult),
      close: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<neo4j.Session>;
    
    // Create mock Driver
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
      close: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<neo4j.Driver>;
    
    // Mock neo4j.driver to return our mock driver
    (neo4j.driver as jest.Mock).mockReturnValue(mockDriver);
    (neo4j.auth.basic as jest.Mock) = jest.fn().mockReturnValue({ username: 'neo4j', password: 'password' });
    
    // Create Neo4jService instance
    neo4jService = new Neo4jService();
  });
  
  describe('constructor', () => {
    it('should initialize Neo4j driver with environment variables', () => {
      expect(neo4j.driver).toHaveBeenCalledWith(
        'neo4j://localhost:7687',
        expect.any(Object)
      );
    });
    
    it('should throw error if NEO4J_URI environment variable is missing', () => {
      // Temporarily remove environment variable
      const originalNeo4jUri = process.env.NEO4J_URI;
      delete process.env.NEO4J_URI;
      
      expect(() => new Neo4jService()).toThrow('NEO4J_URI is not defined in the environment variables');
      
      // Restore environment variable
      process.env.NEO4J_URI = originalNeo4jUri;
    });
  });
  
  describe('getSession', () => {
    it('should return Neo4j session', () => {
      const session = neo4jService.getSession();
      expect(session).toBe(mockSession);
      expect(mockDriver.session).toHaveBeenCalled();
    });
  });
  
  describe('close', () => {
    it('should close Neo4j driver', async () => {
      await neo4jService.close();
      expect(mockDriver.close).toHaveBeenCalled();
    });
  });
  
  describe('createConstraintsAndIndexes', () => {
    it('should create constraints and indexes', async () => {
      await neo4jService.createConstraintsAndIndexes(mockSession);
      
      // Verify that run was called for each constraint/index
      expect(mockSession.run).toHaveBeenCalledTimes(6);
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE CONSTRAINT file_path IF NOT EXISTS')
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE CONSTRAINT directory_path IF NOT EXISTS')
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE CONSTRAINT project_name IF NOT EXISTS')
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE CONSTRAINT version_name IF NOT EXISTS')
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX function_index IF NOT EXISTS')
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX class_index IF NOT EXISTS')
      );
    });
    
    it('should handle error when creating constraints and indexes', async () => {
      const error = new Error('Neo4j error');
      mockSession.run.mockRejectedValueOnce(error);
      
      await expect(neo4jService.createConstraintsAndIndexes(mockSession)).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('createOrGetProject', () => {
    it('should create or get project node', async () => {
      const projectName = 'test-project';
      const rootPath = '/path/to/root';
      
      await neo4jService.createOrGetProject(mockSession, projectName, rootPath);
      
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringMatching(/MERGE \(p:Project {name: \$name}\)/),
        { name: projectName, rootPath: rootPath }
      );
    });
    
    it('should handle error when creating or getting project', async () => {
      const projectName = 'test-project';
      const rootPath = '/path/to/root';
      const error = new Error('Neo4j error');
      
      mockSession.run.mockRejectedValueOnce(error);
      
      await expect(neo4jService.createOrGetProject(mockSession, projectName, rootPath)).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('createVersion', () => {
    it('should create a version node', async () => {
      const versionName = 'v_123456789';
      const projectName = 'test-project';
      
      await neo4jService.createVersion(mockSession, versionName, projectName);
      
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE \(v:Version {name: \$versionName, timestamp: datetime\(\)}\)/),
        { versionName, projectName }
      );
    });
    
    it('should handle error when creating version', async () => {
      const versionName = 'v_123456789';
      const projectName = 'test-project';
      const error = new Error('Neo4j error');
      
      mockSession.run.mockRejectedValueOnce(error);
      
      await expect(neo4jService.createVersion(mockSession, versionName, projectName)).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('markFileAsDeleted', () => {
    it('should mark file as deleted', async () => {
      const filePath = 'path/to/file.ts';
      const versionName = 'v_123456789';
      
      await neo4jService.markFileAsDeleted(mockSession, filePath, versionName);
      
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringMatching(/MATCH \(f:File {path: \$filePath}\)/),
        { filePath, versionName }
      );
    });
    
    it('should handle error when marking file as deleted', async () => {
      const filePath = 'path/to/file.ts';
      const versionName = 'v_123456789';
      const error = new Error('Neo4j error');
      
      mockSession.run.mockRejectedValueOnce(error);
      
      await expect(neo4jService.markFileAsDeleted(mockSession, filePath, versionName)).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  // Test for additional methods can be added similarly
  // This covers the basic pattern for testing Neo4j service methods
  
  describe('handleDeletedEntities', () => {
    it('should skip handling if file does not exist', async () => {
      const filePath = 'path/to/file.ts';
      const currentFunctions:[] = [];
      const currentClasses:[] = [];
      const versionName = 'v_123456789';
      
      // Mock empty result (file not found)
      (await mockResult).records = [];
      mockSession.run.mockResolvedValueOnce(mockResult);
      
      await neo4jService.handleDeletedEntities(mockSession, filePath, currentFunctions, currentClasses, versionName);
      
      // Should only call run once to check if file exists
      expect(mockSession.run).toHaveBeenCalledTimes(1);
    });
  });
  
  // Additional tests for other methods would follow the same pattern
});
