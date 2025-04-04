import fs from 'fs';
import { FileSystemService } from '../../src/services/filesystem.service';

// Mock fs functions to test gitignore parsing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

// Mock path functions
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  relative: jest.fn((from, to) => to.replace(from + '/', '')),
  basename: jest.fn((p) => p.split('/').pop() || ''),
  extname: jest.fn((p) => {
    const parts = p.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
}));

// Mock logger to avoid console output in tests
jest.mock('src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    fileSystemService = new FileSystemService();
    
    // Default mock implementations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true, size: 1000 });
  });
  
  describe('getAllFilesFromDisk', () => {
    it('should use gitignore patterns when .gitignore file exists', () => {
      // Setup mocks
      const mockGitIgnoreContent = `
# Comment line
node_modules/
*.log
/dist/
!important.log
`;
      
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        return filePath.endsWith('.gitignore') || filePath === '/test/path';
      });
      
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.endsWith('.gitignore')) {
          return mockGitIgnoreContent;
        }
        return 'file content';
      });
      
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'dist', isDirectory: () => true, isFile: () => false },
        { name: 'app.ts', isDirectory: () => false, isFile: () => true },
        { name: 'server.log', isDirectory: () => false, isFile: () => true },
        { name: 'important.log', isDirectory: () => false, isFile: () => true },
      ]);
      
      // Execute
      const files = fileSystemService.getAllFilesFromDisk('/test/path');
      
      // Verify
      expect(fs.readFileSync).toHaveBeenCalledWith('/test/path/.gitignore', 'utf8');
      
      // Should include app.ts and important.log (negated pattern) but not server.log or directories in gitignore
      expect(files.length).toBe(2);
      expect(files.some(f => f.relativePath === 'app.ts')).toBe(true);
      expect(files.some(f => f.relativePath === 'important.log')).toBe(true);
      expect(files.some(f => f.relativePath === 'server.log')).toBe(false);
      
      // Verify that the ignored directories weren't scanned
      expect(fs.readdirSync).not.toHaveBeenCalledWith('/test/path/node_modules', expect.anything());
      expect(fs.readdirSync).not.toHaveBeenCalledWith('/test/path/dist', expect.anything());
      expect(fs.readdirSync).toHaveBeenCalledWith('/test/path/src', expect.anything());
    });
    
    it('should fall back to default exclusions when no .gitignore file exists', () => {
      // Setup mocks
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        return !filePath.endsWith('.gitignore') && filePath === '/test/path';
      });
      
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'app.ts', isDirectory: () => false, isFile: () => true },
        { name: '.env', isDirectory: () => false, isFile: () => true },
        { name: 'server.log', isDirectory: () => false, isFile: () => true },
      ]);
      
      // Execute
      const files = fileSystemService.getAllFilesFromDisk('/test/path');
      
      // Verify
      // Should exclude node_modules, .git directories, .env and .log files
      expect(files.length).toBe(1);
      expect(files.some(f => f.relativePath === 'app.ts')).toBe(true);
      expect(files.some(f => f.relativePath === '.env')).toBe(false);
      expect(files.some(f => f.relativePath === 'server.log')).toBe(false);
      
      // Verify that the excluded directories weren't scanned
      expect(fs.readdirSync).not.toHaveBeenCalledWith('/test/path/node_modules', expect.anything());
      expect(fs.readdirSync).not.toHaveBeenCalledWith('/test/path/.git', expect.anything());
      expect(fs.readdirSync).toHaveBeenCalledWith('/test/path/src', expect.anything());
    });
  });
  
  describe('listDirectories', () => {
    it('should use gitignore patterns for directories when .gitignore file exists', () => {
      // Setup mocks
      const mockGitIgnoreContent = `
node_modules/
build/
`;
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.endsWith('.gitignore')) {
          return mockGitIgnoreContent;
        }
        return 'file content';
      });
      
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'build', isDirectory: () => true, isFile: () => false },
        { name: '.git', isDirectory: () => true, isFile: () => false },
      ]);
      
      // Execute
      const dirs = fileSystemService.listDirectories('/test/path');
      
      // Verify
      // Should include only src (exclude node_modules, build from gitignore and .git by default)
      expect(dirs.length).toBe(1);
      expect(dirs[0].name).toBe('src');
    });
  });
});
