import { CarverApiClient } from '../client';
import { FileApiClient } from '../file';
import { ProjectFile, ProjectFileContent, FileImports } from '../types';

// Mock the CarverApiClient
jest.mock('../client');

describe('FileApiClient with Caching', () => {
  let mockApiClient: jest.Mocked<CarverApiClient>;
  let fileClient: FileApiClient;
  
  const mockFiles: ProjectFile[] = [
    {
      path: '/path/to/file1.ts',
      name: 'file1.ts',
      extension: 'ts'
    },
    {
      path: '/path/to/file2.ts',
      name: 'file2.ts',
      extension: 'ts'
    }
  ];
  
  const mockFileContent: ProjectFileContent = {
    content: 'console.log("Hello World");',
    hash: 'abc123',
    lastModified: '2023-01-01'
  };
  
  const mockImports: string[] = ['react', 'lodash'];
  const mockFileImports: FileImports = {
    imports: mockImports
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a mock for the CarverApiClient
    mockApiClient = new CarverApiClient() as jest.Mocked<CarverApiClient>;
    
    // Setup the get method to return mock data
    mockApiClient.get.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/projects/testProject/files') {
        return mockFiles;
      } else if (endpoint === '/projects/testProject/files/file1.ts') {
        return mockFileContent;
      } else if (endpoint === '/projects/testProject/files/file1.ts/imports') {
        return mockImports;
      }
      throw new Error('Not found');
    });
    
    // Create FileApiClient with short TTL for testing
    fileClient = new FileApiClient(mockApiClient, { ttl: 1000 });
    
    // Setup fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should fetch project files from API on first call', async () => {
    const files = await fileClient.getProjectFiles({
      projectName: 'testProject'
    });
    
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/projects/testProject/files',
      {}
    );
    expect(files).toEqual(mockFiles);
  });

  test('should use cache for subsequent project files calls', async () => {
    // First call should hit the API
    await fileClient.getProjectFiles({
      projectName: 'testProject'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Second call should use cache
    await fileClient.getProjectFiles({
      projectName: 'testProject'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1); // Still only one call
  });

  test('should fetch file content from API on first call', async () => {
    const fileContent = await fileClient.getProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/projects/testProject/files/file1.ts',
      { fields: 'content,hash,lastModified' }
    );
    expect(fileContent).toEqual(mockFileContent);
  });

  test('should use cache for subsequent file content calls', async () => {
    // First call should hit the API
    await fileClient.getProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Second call should use cache
    await fileClient.getProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1); // Still only one call
  });

  test('should bypass cache when forceRefresh is true', async () => {
    // First call
    await fileClient.getProjectFiles({
      projectName: 'testProject'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Second call with forceRefresh
    await fileClient.getProjectFiles({
      projectName: 'testProject'
    }, true);
    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
  });

  test('should fetch file imports from API on first call', async () => {
    const imports = await fileClient.getFileImports({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/projects/testProject/files/file1.ts/imports'
    );
    expect(imports).toEqual(mockFileImports);
  });

  test('should use cache for subsequent file imports calls', async () => {
    // First call should hit the API
    await fileClient.getFileImports({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Second call should use cache
    await fileClient.getFileImports({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1); // Still only one call
  });

  test('should expire cache entries after TTL', async () => {
    // First call
    await fileClient.getProjectFiles({
      projectName: 'testProject'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Time travel past the TTL (1000ms)
    jest.advanceTimersByTime(1001);
    
    // Second call should hit the API again due to cache expiration
    await fileClient.getProjectFiles({
      projectName: 'testProject'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
  });

  test('should invalidate file cache after write operation', async () => {
    // Mock the post method for write operations
    mockApiClient.post.mockResolvedValue({ jobId: '123', path: 'file1.ts' });
    
    // First call to get the file content
    await fileClient.getProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Write to the file
    await fileClient.writeProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts',
      content: 'new content'
    });
    
    // After writing, the cache should be invalidated
    // So the next get should hit the API again
    await fileClient.getProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
  });

  test('should invalidate file cache after update operation', async () => {
    // Mock the put method for update operations
    mockApiClient.put.mockResolvedValue({ jobId: '123', path: 'file1.ts' });
    
    // First call to get the file content
    await fileClient.getProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Update the file
    await fileClient.updateProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts',
      oldText: 'Hello',
      newText: 'World'
    });
    
    // After updating, the cache should be invalidated
    // So the next get should hit the API again
    await fileClient.getProjectFile({
      projectName: 'testProject',
      filePath: 'file1.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
  });

  test('should handle search parameters in cache keys', async () => {
    // First call with search term
    await fileClient.getProjectFiles({
      projectName: 'testProject',
      searchTerm: '.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Second call with same search term should use cache
    await fileClient.getProjectFiles({
      projectName: 'testProject',
      searchTerm: '.ts'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    
    // Call with different search term should hit API again
    await fileClient.getProjectFiles({
      projectName: 'testProject',
      searchTerm: '.js'
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
  });
});
