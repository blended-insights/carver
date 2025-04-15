import type { WatcherStatusNotification, FileChangeNotification } from './redis';

/**
 * Standard API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Folder entity with basic information
 */
export interface Folder {
  name: string;
  path: string;
  size: number;
}

/**
 * Watcher process information
 */
export interface Watcher {
  processId: string;
  folderPath: string;
  status: 'running' | 'shutdown' | 'error';
  projectName?: string;
}

/**
 * Response from starting a new watcher
 */
export interface StartWatcherResponse {
  success: boolean;
  processId: string;
  message: string;
}

/**
 * Response from killing a watcher
 */
export interface KillWatcherResponse {
  success: boolean;
  message: string;
}

/**
 * Response from restarting a watcher
 */
export interface RestartWatcherResponse {
  processId: string;
  status: 'running';
  message: string;
}

/**
 * Events response from SSE endpoint
 */
export interface EventsResponse {
  channel: 'watcher.status' | 'file.change';
  data: WatcherStatusNotification | FileChangeNotification;
}

/**
 * Project file information
 */
export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
}

/**
 * Parameters for searching files
 */
export interface SearchFilesParams {
  projectName: string;
  searchTerm: string;
}
