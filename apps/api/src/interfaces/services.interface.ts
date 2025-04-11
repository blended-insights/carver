import { Redis } from 'ioredis';

export interface FileNode {
  path: string;
  name: string;
  extension: string;
  content: string;
}

export interface FunctionNode {
  name: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  parameters: string[];
  className?: string; // Optional field to track if this function is a class method
}

export interface ClassNode {
  name: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  methods: string[];
  properties: string[];
}

export interface VariableNode {
  name: string;
  filePath: string;
  type: string;
  line: number;
}

export interface ImportNode {
  source: string;
  filePath: string;
  line: number;
}

export interface ExportNode {
  name: string;
  filePath: string;
  line: number;
  isDefault: boolean;
}

/**
 * Interface for Neo4j Service
 */
export interface INeo4jService {
  close(): Promise<void>;
  createConstraintsAndIndexes(): Promise<void>;
  createOrGetProject(projectName: string, rootPath: string): Promise<void>;
  createVersion(versionName: string, projectName: string): Promise<void>;
  markFileAsDeleted(filePath: string, versionName: string): Promise<void>;
  createFileVersionRelationship(
    filePath: string,
    versionName: string
  ): Promise<void>;
  linkEntityToVersion(
    entityType: 'Function' | 'Class' | 'Variable',
    name: string,
    filePath: string,
    versionName: string
  ): Promise<void>;
  handleDeletedEntities(
    filePath: string,
    currentFunctions: FunctionNode[],
    currentClasses: ClassNode[],
    versionName: string
  ): Promise<void>;
  processEntityMovements(
    filePath: string,
    functions: FunctionNode[],
    classes: ClassNode[],
    versionName: string
  ): Promise<void>;
  createFunctionNode(func: FunctionNode): Promise<void>;
  createClassNode(cls: ClassNode): Promise<void>;
  createVariableNode(variable: VariableNode): Promise<void>;
  createImportNode(importNode: ImportNode): Promise<void>;
  createExportNode(exportNode: ExportNode): Promise<void>;
  createFunctionCallRelationships(
    filePath: string,
    functionCalls: { caller: string; callee: string }[]
  ): Promise<void>;
  createDirectoryNode(
    dirPath: string,
    dirName: string,
    projectName: string
  ): Promise<void>;
  createDirectoryRelationship(
    parentPath: string,
    childPath: string
  ): Promise<void>;
  createFileNode(
    filePath: string,
    fileName: string,
    fileExtension: string,
    dirPath: string,
    projectName: string
  ): Promise<void>;
  getLatestVersionName(projectName: string): Promise<string | null>;
  getProjectByName(projectName: string): Promise<{
    id: string;
    name: string;
    path: string;
    fileCount: number;
    lastUpdated: string | null;
  } | null>;
  getAllProjects(): Promise<
    Array<{
      id: string;
      name: string;
      path: string;
      fileCount: number;
      lastUpdated: string | null;
    }>
  >;
  getAllFiles(): Promise<{ path: string; name: string; extension: string }[]>;
  getFilesByProject(
    projectName: string
  ): Promise<{ path: string; name: string; extension: string }[]>;
  searchFilesByProject(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]>;
  searchFilesByFunction(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]>;
  searchFilesByImport(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]>;
  searchFilesByDirectory(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]>;
  executeQuery<T = Record<string, unknown>>(
    query: string,
    params?: Record<string, unknown>
  ): Promise<T[]>;
  clearDatabase(): Promise<void>;
}

/**
 * Interface for Redis Service
 */
export interface IRedisService {
  getClient(): Redis;
  close(): Promise<void>;
  getProjectFileKeys(projectName: string): Promise<string[]>;
  scanKeys(
    pattern: string,
    type?: 'hash' | 'string' | 'list' | 'set' | 'zset'
  ): Promise<string[]>;
  getProjectFiles(
    projectName: string
  ): Promise<{ path: string; name: string; extension: string }[]>;
  getFileHash(projectName: string, filePath: string): Promise<string | null>;
  storeFileData(
    projectName: string,
    filePath: string,
    content: string,
    hash: string
  ): Promise<void>;
  deleteFileData(projectName: string, filePath: string): Promise<void>;
  publishFileChange(
    processId: string,
    eventType: 'add' | 'change' | 'unlink',
    filePath: string
  ): Promise<void>;
  publishStatus(
    processId: string,
    status: string,
    message?: string
  ): Promise<void>;
  flushAll(): Promise<void>;
}

/**
 * Interface for FileSystem Service
 */
export interface IFileSystemService {
  calculateHash(content: string): string;
  getAllFilesFromDisk(
    rootPath: string
  ): { relativePath: string; content: string }[];
  convertToFileNode(file: { relativePath: string; content: string }): FileNode;
  directoryExists(dirPath: string): boolean;
  listDirectories(
    dirPath: string
  ): { name: string; path: string; size: number }[];
  filterTypeScriptFiles(files: FileNode[]): FileNode[];
  filterLargeFiles(files: FileNode[], maxSize?: number): FileNode[];
  fileExists(filePath: string): boolean;
  readFileContent(filePath: string): string | null;
  writeFileContent(filePath: string, content: string): Promise<boolean>;
  isTypeScriptFile(file: { path: string; extension: string }): boolean;
  isSupportedExtension(extension: string): boolean;
}

/**
 * Interface for Watcher Manager
 */
/**
 * Interface for Git Version Manager
 */
export interface IGitVersionManager {
  startWatching(): Promise<boolean>;
  stopWatching(): void;
  getCurrentVersion(): Promise<string>;
}

/**
 * Interface for Git Version Manager Factory
 */
export interface IGitVersionManagerFactory {
  getManager(
    rootPath: string,
    onVersionChange: (version: string) => void
  ): IGitVersionManager;
  cleanup(): void;
}

/**
 * Interface for Watcher Manager
 */
export interface IWatcherManager {
  startWatcher(folderPath: string, projectName: string): Promise<string>;
  restartWatcher(processId: string): Promise<boolean>;
  killWatcher(processId: string): Promise<boolean>;
  getActiveWatchers(): {
    processId: string;
    folderPath: string;
    projectName: string;
  }[];
  getActiveWatcherIds(): string[];
  cleanup(): Promise<void>;
}
