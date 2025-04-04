import axios from 'axios';
import logger from './logger';
import { WatcherStatusNotification, FileChangeNotification } from './redis';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface Folder {
  name: string;
  path: string;
  size: number;
}

export interface WatcherProcess {
  processId: string;
  folderPath: string;
  status: 'running' | 'shutdown' | 'error';
  startTime?: string;
  pid?: number;
  projectName?: string;
}

export interface StartWatcherResponse {
  processId: string;
  folderPath: string;
  status: 'running';
  message: string;
}

export interface KillWatcherResponse {
  success: boolean;
  message: string;
}

export interface RestartWatcherResponse {
  processId: string;
  status: 'running';
  message: string;
}

// API client setup
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_WATCHER_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Log the error
    logger.error('API Error:', error.message);
    
    // Check if the error is a CORS error
    if (error.message && error.message.includes('Network Error')) {
      // Create a more helpful error message
      error.message = 'Network Error: This may be due to CORS issues. Make sure the watcher API server has CORS enabled and is running.';
    }
    
    return Promise.reject(error);
  }
);

// Folders API
export const fetchAvailableFolders = async (): Promise<Folder[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Folder[]>>('/folders');
    return response.data.data;
  } catch (error) {
    logger.error('Error fetching folders:', error);
    throw error;
  }
};

// Watcher API
export const startWatcher = async (folder: string): Promise<StartWatcherResponse> => {
  try {
    const response = await apiClient.get<ApiResponse<StartWatcherResponse>>(`/start?folder=${encodeURIComponent(folder)}`);
    return response.data.data;
  } catch (error) {
    logger.error('Error starting watcher:', error);
    throw error;
  }
};

export const killWatcher = async (processId: string): Promise<KillWatcherResponse> => {
  try {
    const response = await apiClient.get<ApiResponse<KillWatcherResponse>>(`/kill?processId=${encodeURIComponent(processId)}`);
    return response.data.data;
  } catch (error) {
    logger.error('Error killing watcher:', error);
    throw error;
  }
};

export const restartWatcher = async (processId: string): Promise<RestartWatcherResponse> => {
  try {
    const response = await apiClient.get<ApiResponse<RestartWatcherResponse>>(`/restart?processId=${encodeURIComponent(processId)}`);
    return response.data.data;
  } catch (error) {
    logger.error('Error restarting watcher:', error);
    throw error;
  }
};

export interface StatusResponse {
  activeWatchers: WatcherProcess[];
}

export const fetchWatcherStatus = async (): Promise<WatcherProcess[]> => {
  try {
    const response = await apiClient.get<ApiResponse<StatusResponse>>('/status');
    return response.data.data.activeWatchers;
  } catch (error) {
    logger.error('Error fetching watcher status:', error);
    throw error;
  }
};

// Event API Types
export interface EventsResponse {
  channel: 'watcher.status' | 'file.change';
  data: WatcherStatusNotification | FileChangeNotification;
}
