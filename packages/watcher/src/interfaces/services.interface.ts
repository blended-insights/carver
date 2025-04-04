import * as neo4j from 'neo4j-driver';
import { Redis } from 'ioredis';
import {
  FileNode,
  FunctionNode,
  ClassNode,
  VariableNode,
  ImportNode,
  ExportNode
} from '@/lib/seeder/types';

/**
 * Interface for Neo4j Service
 */
export interface INeo4jService {
  getSession(): neo4j.Session;
  close(): Promise<void>;
  createConstraintsAndIndexes(session: neo4j.Session): Promise<void>;
  createOrGetProject(session: neo4j.Session, projectName: string, rootPath: string): Promise<void>;
  createVersion(session: neo4j.Session, versionName: string, projectName: string): Promise<void>;
  markFileAsDeleted(session: neo4j.Session, filePath: string, versionName: string): Promise<void>;
  createFileVersionRelationship(session: neo4j.Session, filePath: string, versionName: string): Promise<void>;
  linkEntityToVersion(
    session: neo4j.Session,
    entityType: 'Function' | 'Class' | 'Variable',
    name: string,
    filePath: string,
    versionName: string
  ): Promise<void>;
  handleDeletedEntities(
    session: neo4j.Session,
    filePath: string,
    currentFunctions: FunctionNode[],
    currentClasses: ClassNode[],
    versionName: string,
  ): Promise<void>;
  processEntityMovements(
    session: neo4j.Session,
    filePath: string,
    functions: FunctionNode[],
    classes: ClassNode[],
    versionName: string,
  ): Promise<void>;
  createFunctionNode(session: neo4j.Session, func: FunctionNode): Promise<void>;
  createClassNode(session: neo4j.Session, cls: ClassNode): Promise<void>;
  createVariableNode(session: neo4j.Session, variable: VariableNode): Promise<void>;
  createImportNode(session: neo4j.Session, importNode: ImportNode): Promise<void>;
  createExportNode(session: neo4j.Session, exportNode: ExportNode): Promise<void>;
  createFunctionCallRelationships(
    session: neo4j.Session,
    filePath: string,
    functionCalls: { caller: string; callee: string }[]
  ): Promise<void>;
}

/**
 * Interface for Redis Service
 */
export interface IRedisService {
  getClient(): Redis;
  close(): Promise<void>;
  getProjectFileKeys(projectName: string): Promise<string[]>;
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
}

/**
 * Interface for FileSystem Service
 */
export interface IFileSystemService {
  calculateHash(content: string): string;
  getAllFilesFromDisk(rootPath: string): { relativePath: string; content: string }[];
  convertToFileNode(file: { relativePath: string; content: string }): FileNode;
  directoryExists(dirPath: string): boolean;
  listDirectories(dirPath: string): { name: string; path: string; size: number }[];
  filterTypeScriptFiles(files: FileNode[]): FileNode[];
  filterLargeFiles(files: FileNode[], maxSize?: number): FileNode[];
}

/**
 * Interface for Watcher Manager
 */
export interface IWatcherManager {
  startWatcher(folderPath: string, projectName: string): Promise<string>;
  restartWatcher(processId: string): Promise<boolean>;
  killWatcher(processId: string): Promise<boolean>;
  getActiveWatchers(): { processId: string; folderPath: string; projectName: string }[];
  getActiveWatcherIds(): string[];
  cleanup(): Promise<void>;
}
