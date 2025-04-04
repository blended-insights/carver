import * as fs from 'fs';
import * as path from 'path';
import { FileSystemService } from '../services/filesystem.service';
import { FileNode } from '@/lib/seeder/types';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  
  beforeEach(() => {
    fileSystemService = new FileSystemService();
    jest.clearAllMocks();
  });
  
  describe('calculateHash', () => {
    it('should calculate a SHA-256 hash of the content', () => {
      const content = 'test content';
      const hash = fileSystemService.calculateHash(content);
      
      // SHA-256 hash of 'test content'
      expect(hash).toEqual(expect.any(String));
      expect(hash.length).toBe(64); // SHA-256 hash length
    });
  });
  
  describe('directoryExists', () => {
    it('should return true if directory exists', () => {
      const dirPath = '/path/to/dir';
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      
      const result = fileSystemService.directoryExists(dirPath);
      
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(dirPath);
      expect(fs.statSync).toHaveBeenCalledWith(dirPath);
    });
    
    it('should return false if directory does not exist', () => {
      const dirPath = '/path/to/dir';
      
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = fileSystemService.directoryExists(dirPath);
      
      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith(dirPath);
      expect(fs.statSync).not.toHaveBeenCalled();
    });
    
    it('should return false if path exists but is not a directory', () => {
      const dirPath = '/path/to/file';
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });
      
      const result = fileSystemService.directoryExists(dirPath);
      
      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith(dirPath);
      expect(fs.statSync).toHaveBeenCalledWith(dirPath);
    });
    
    it('should return false if checking directory throws an error', () => {
      const dirPath = '/path/to/dir';
      
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File access error');
      });
      
      const result = fileSystemService.directoryExists(dirPath);
      
      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith(dirPath);
    });
  });
  
  describe('getAllFilesFromDisk', () => {
    it('should return all files from disk', () => {
      const rootPath = '/path/to/root';
      const mockEntries = [
        { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
        { name: 'dir1', isDirectory: () => true, isFile: () => false },
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: '.DS_Store', isDirectory: () => false, isFile: () => true },
      ];
      
      (fs.readdirSync as jest.Mock).mockReturnValue(mockEntries);
      (path.join as jest.Mock).mockImplementation((dir, file) => `${dir}/${file}`);
      (path.relative as jest.Mock).mockReturnValue('file1.ts');
      (fs.readFileSync as jest.Mock).mockReturnValue('file content');
      
      const result = fileSystemService.getAllFilesFromDisk(rootPath);
      
      expect(result).toEqual([{ relativePath: 'file1.ts', content: 'file content' }]);
      expect(fs.readdirSync).toHaveBeenCalledWith(rootPath, { withFileTypes: true });
    });
  });
  
  describe('convertToFileNode', () => {
    it('should convert file data to FileNode format', () => {
      const fileData = { relativePath: 'path/to/file.ts', content: 'file content' };
      
      (path.basename as jest.Mock).mockReturnValue('file.ts');
      (path.extname as jest.Mock).mockReturnValue('.ts');
      
      const result = fileSystemService.convertToFileNode(fileData);
      
      expect(result).toEqual({
        path: 'path/to/file.ts',
        name: 'file.ts',
        extension: '.ts',
        content: 'file content',
      });
      expect(path.basename).toHaveBeenCalledWith('path/to/file.ts');
      expect(path.extname).toHaveBeenCalledWith('path/to/file.ts');
    });
  });
  
  describe('listDirectories', () => {
    it('should list directories', () => {
      const dirPath = '/path/to/dir';
      const mockEntries = [
        { name: 'dir1', isDirectory: () => true, isFile: () => false },
        { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
        { name: '.hidden', isDirectory: () => true, isFile: () => false },
      ];
      
      (fs.readdirSync as jest.Mock).mockReturnValue(mockEntries);
      (path.join as jest.Mock).mockImplementation((dir, file) => `${dir}/${file}`);
      
      // Mock private method with Jest spyOn
      jest.spyOn(fileSystemService as any, 'calculateFolderSize').mockReturnValue(1024);
      
      const result = fileSystemService.listDirectories(dirPath);
      
      expect(result).toEqual([
        { name: 'dir1', path: '/path/to/dir/dir1', size: 1024 },
      ]);
      expect(fs.readdirSync).toHaveBeenCalledWith(dirPath, { withFileTypes: true });
    });
  });
  
  describe('filterTypeScriptFiles', () => {
    it('should filter TypeScript/JavaScript files', () => {
      const files: FileNode[] = [
        { path: 'file1.ts', name: 'file1.ts', extension: '.ts', content: '' },
        { path: 'file2.js', name: 'file2.js', extension: '.js', content: '' },
        { path: 'file3.tsx', name: 'file3.tsx', extension: '.tsx', content: '' },
        { path: 'file4.jsx', name: 'file4.jsx', extension: '.jsx', content: '' },
        { path: 'file5.md', name: 'file5.md', extension: '.md', content: '' },
      ];
      
      const result = fileSystemService.filterTypeScriptFiles(files);
      
      expect(result).toEqual([
        { path: 'file1.ts', name: 'file1.ts', extension: '.ts', content: '' },
        { path: 'file2.js', name: 'file2.js', extension: '.js', content: '' },
        { path: 'file3.tsx', name: 'file3.tsx', extension: '.tsx', content: '' },
        { path: 'file4.jsx', name: 'file4.jsx', extension: '.jsx', content: '' },
      ]);
    });
  });
  
  describe('filterLargeFiles', () => {
    it('should filter out files larger than maxSize', () => {
      const files: FileNode[] = [
        { path: 'file1.ts', name: 'file1.ts', extension: '.ts', content: 'a'.repeat(500) },
        { path: 'file2.ts', name: 'file2.ts', extension: '.ts', content: 'a'.repeat(2000) },
        { path: 'file3.ts', name: 'file3.ts', extension: '.ts', content: 'a'.repeat(1000) },
      ];
      
      const result = fileSystemService.filterLargeFiles(files, 1000);
      
      expect(result).toEqual([
        { path: 'file1.ts', name: 'file1.ts', extension: '.ts', content: 'a'.repeat(500) },
        { path: 'file3.ts', name: 'file3.ts', extension: '.ts', content: 'a'.repeat(1000) }
      ]);
    });
    
    it('should use default maxSize if not provided', () => {
      const files: FileNode[] = [
        { path: 'file1.ts', name: 'file1.ts', extension: '.ts', content: 'a'.repeat(1024 * 1024 - 1) },
        { path: 'file2.ts', name: 'file2.ts', extension: '.ts', content: 'a'.repeat(1024 * 1024 + 1) },
      ];
      
      const result = fileSystemService.filterLargeFiles(files);
      
      expect(result).toEqual([
        { path: 'file1.ts', name: 'file1.ts', extension: '.ts', content: 'a'.repeat(1024 * 1024 - 1) },
      ]);
    });
  });
});
