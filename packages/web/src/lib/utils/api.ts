import axios from 'axios';
import logger from './logger';
import {
  WatcherStatusNotification,
  FileChangeNotification,
} from '@/types/redis';
import useSWR, { SWRConfiguration, mutate } from 'swr';

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

export interface Watcher {
  processId: string;
  folderPath: string;
  status: 'running' | 'shutdown' | 'error';
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

export interface EventsResponse {
  channel: 'watcher.status' | 'file.change';
  data: WatcherStatusNotification | FileChangeNotification;
}

// API URL Keys for SWR
export const API_URLS = {
  FOLDERS: '/folders',
  WATCHERS: '/watchers',
  WATCHER: (processId: string) => `/watchers/${encodeURIComponent(processId)}`,
  START: (folderPath: string) =>
    `/folders/${encodeURIComponent(folderPath)}/start`,
  KILL: (processId: string) =>
    `/watchers/${encodeURIComponent(processId)}/kill`,
  RESTART: (processId: string) =>
    `/watchers/${encodeURIComponent(processId)}/restart`,
};

// Default SWR configuration
const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 0, // Default to no polling
  dedupingInterval: 2000,
};

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
  (response) => response,
  (error) => {
    // Log the error
    logger.error('API Error:', error.message);

    // Check if the error is a CORS error
    if (error.message && error.message.includes('Network Error')) {
      // Create a more helpful error message
      error.message =
        'Network Error: This may be due to CORS issues. Make sure the watcher API server has CORS enabled and is running.';
    }

    return Promise.reject(error);
  }
);

// General fetcher function for SWR
const fetcher = async (url: string) => {
  try {
    const response = await apiClient.get<ApiResponse<any>>(url);
    return response.data.data;
  } catch (error) {
    logger.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

// SWR-based Hooks for data fetching

// Hook for fetching available folders
export function useFolders(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Folder[]>(
    API_URLS.FOLDERS,
    fetcher,
    { ...defaultSWRConfig, ...config }
  );

  return {
    folders: data || [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

// Hook for fetching watcher status
export function useWatchers(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Watcher[]>(
    API_URLS.WATCHERS,
    fetcher,
    {
      ...defaultSWRConfig,
      ...config,
    }
  );

  return {
    watchers: data || [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

// Hook for fetching watche by processId status
export function useWatcherByProcessId(
  processId: string,
  config?: SWRConfiguration
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Watcher>(
    API_URLS.WATCHER(processId),
    fetcher,
    {
      ...defaultSWRConfig,
      ...config,
    }
  );

  return {
    watcher: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

// Action functions with cache invalidation

// Start a watcher for a folder
export const startWatcher = async (
  folderPath: string
): Promise<StartWatcherResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<StartWatcherResponse>>(
      API_URLS.START(folderPath)
    );

    // Invalidate the status cache to reflect the new watcher
    mutate(API_URLS.WATCHERS);

    return response.data.data;
  } catch (error) {
    logger.error('Error starting watcher:', error);
    throw error;
  }
};

// Kill a watcher process
export const killWatcher = async (
  processId: string
): Promise<KillWatcherResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<KillWatcherResponse>>(
      API_URLS.KILL(processId)
    );

    // Invalidate the status cache to reflect the killed watcher
    mutate(API_URLS.WATCHERS);
    mutate(API_URLS.WATCHER(processId));

    return response.data.data;
  } catch (error) {
    logger.error('Error killing watcher:', error);
    throw error;
  }
};

// Restart a watcher process
export const restartWatcher = async (
  processId: string
): Promise<RestartWatcherResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<RestartWatcherResponse>>(
      API_URLS.RESTART(processId)
    );

    // Invalidate the status cache to reflect the restarted watcher
    mutate(API_URLS.WATCHERS);
    mutate(API_URLS.WATCHER(processId));

    return response.data.data;
  } catch (error) {
    logger.error('Error restarting watcher:', error);
    throw error;
  }
};
