import axios from 'axios';
import logger from './logger';
import type {
  WatcherStatusNotification,
  FileChangeNotification,
} from '@/types/redis';
import useSWR, { SWRConfiguration, mutate } from 'swr';
import { SWR_DEFAULT_CONFIG } from '../config/swr-config';

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
  success: boolean;
  processId: string;
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

export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
}

export interface SearchFilesParams {
  projectName: string;
  searchTerm: string;
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
  PROJECT_FILES: (projectName: string) =>
    `/projects/${encodeURIComponent(projectName)}/files`,
  SEARCH_FILES: (projectName: string, searchTerm: string) =>
    `/project/${encodeURIComponent(
      projectName
    )}/search?term=${encodeURIComponent(searchTerm)}`,
};

// API client setup with improved configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_WATCHER_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response) => {
    logger.debug(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Log the error with better context
    if (error.response) {
      // Server responded with non-2xx status
      logger.error(
        `API Error ${error.response.status}: ${
          error.response.data?.error || error.message
        }`,
        error.config?.url
      );
    } else if (error.request) {
      // Request was made but no response received
      logger.error(`API No Response: ${error.message}`, error.config?.url);

      // Check if the error is a CORS error
      if (error.message && error.message.includes('Network Error')) {
        // Create a more helpful error message
        error.message =
          'Network Error: This may be due to CORS issues. Make sure the watcher API server has CORS enabled and is running.';
      }
    } else {
      // Something else happened
      logger.error(`API Setup Error: ${error.message}`);
    }

    return Promise.reject(error);
  }
);

// Enhanced fetcher function for SWR with better error handling
async function fetcher<T>(url: string) {
  try {
    logger.debug(`Fetching data from ${url}`);
    const response = await apiClient.get<ApiResponse<T>>(url, {
      timeout: 5000,
    });

    // Add timestamp to help track data freshness
    const data = response.data.data;
    if (data && typeof data === 'object') {
      // Add a request timestamp if it doesn't have one
      if (!('timestamp' in data)) {
        Object.defineProperty(data, 'timestamp', {
          value: Date.now(),
          enumerable: false,
        });
      }
    }

    logger.debug(`Data fetched from ${url}:`, data);
    return data;
  } catch (error) {
    logger.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

// SWR-based Hooks for data fetching

/**
 * Hook for fetching available folders
 */
export function useFolders(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Folder[]>(
    API_URLS.FOLDERS,
    fetcher<Folder[]>,
    {
      ...SWR_DEFAULT_CONFIG,
      ...config,
      // Force more aggressive revalidation for this hook
      revalidateOnMount: true,
      revalidateIfStale: true,
      dedupingInterval: 0,
      suspense: false,
      // Additional callbacks
      onLoadingSlow: () => logger.debug('Folders fetch is taking a long time'),
      onSuccess: (data) =>
        logger.debug(`Folders fetch success, got ${data?.length} folders`),
    }
  );

  return {
    folders: data || [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching all watcher statuses
 */
export function useWatchers(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Watcher[]>(
    API_URLS.WATCHERS,
    fetcher<Watcher[]>,
    {
      ...SWR_DEFAULT_CONFIG,
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

/**
 * Hook for fetching a specific watcher by processId
 */
export function useWatcherByProcessId(
  processId: string,
  config?: SWRConfiguration
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Watcher>(
    processId ? API_URLS.WATCHER(processId) : null, // Only fetch if processId exists
    fetcher<Watcher>,
    {
      ...SWR_DEFAULT_CONFIG,
      ...config,
      // Enable Suspense when specifically requested in config
      suspense: config?.suspense || SWR_DEFAULT_CONFIG.suspense,
    }
  );

  // When using Suspense mode, we only need to return what component will use after suspending
  if (config?.suspense) {
    return {
      watcher: data,
      mutate,
    };
  }

  // Standard return for non-Suspense mode
  return {
    watcher: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching files for a specific project
 */
export function useProjectFiles(
  projectName: string | null,
  config?: SWRConfiguration
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    ProjectFile[]
  >(
    projectName ? API_URLS.PROJECT_FILES(projectName) : null, // Only fetch if projectName exists
    fetcher<ProjectFile[]>,
    {
      ...SWR_DEFAULT_CONFIG,
      ...config,
    }
  );

  return {
    files: data || [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for searching files in a project based on a search term
 * This performs a real-time search against Neo4j instead of filtering client-side
 */
export function useSearchProjectFiles(
  projectName: string | null,
  searchTerm: string | null,
  config?: SWRConfiguration
) {
  // Only perform the search if both projectName and searchTerm exist and searchTerm is at least 2 chars
  const shouldSearch = projectName && searchTerm && searchTerm.length >= 2;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    ProjectFile[]
  >(
    shouldSearch ? API_URLS.SEARCH_FILES(projectName, searchTerm) : null,
    fetcher<ProjectFile[]>,
    {
      ...SWR_DEFAULT_CONFIG,
      ...config,
      // Deduplicate requests for the same search term within a short time window
      dedupingInterval: 2000,
    }
  );

  return {
    files: data || [], // Return empty array when no search or no results
    error,
    // Only consider loading if we're actually performing a search
    isLoading: shouldSearch ? isLoading : false,
    isValidating,
    mutate,
  };
}

// Action functions with cache invalidation

/**
 * Start a watcher for a folder
 */
export const startWatcher = async (
  folderPath: string,
  projectName?: string
): Promise<StartWatcherResponse> => {
  try {
    // Add optional project name as a query parameter
    const url = projectName
      ? `${API_URLS.START(folderPath)}?project=${encodeURIComponent(
          projectName
        )}`
      : API_URLS.START(folderPath);

    const response = await apiClient.post<ApiResponse<StartWatcherResponse>>(
      url
    );

    // Log the response data for debugging
    console.log('API response data:', response.data);

    // Invalidate the status cache to reflect the new watcher
    mutate(API_URLS.WATCHERS);
    logger.info(`Started watcher for ${folderPath}`);

    return response.data.data;
  } catch (error) {
    logger.error('Error starting watcher:', error);
    throw error;
  }
};

/**
 * Kill a watcher process
 */
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
    logger.info(`Killed watcher ${processId}`);

    return response.data.data;
  } catch (error) {
    logger.error('Error killing watcher:', error);
    throw error;
  }
};

/**
 * Restart a watcher process
 */
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
    logger.info(`Restarted watcher ${processId}`);

    return response.data.data;
  } catch (error) {
    logger.error('Error restarting watcher:', error);
    throw error;
  }
};
