import useSWR, { SWRConfiguration } from 'swr';
import {
  getWatchers,
  killWatcher,
  restartWatcher,
  startWatcher,
} from '../api/watchers';
import type { Watcher } from '@/types/api';

// SWR fetcher function for watchers
const fetchWatchers = () => getWatchers();

/**
 * Hook for fetching and managing watcher processes
 *
 * @param config Optional SWR configuration
 */
export function useWatchers(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Watcher[]>(
    'watchers',
    fetchWatchers,
    {
      revalidateOnMount: true,
      revalidateIfStale: true,
      ...config,
    }
  );

  return {
    watchers: data || [],
    error,
    isLoading,
    isValidating,
    mutate,

    // Action methods with automatic data revalidation
    killWatcher: async (processId: string) => {
      const result = await killWatcher(processId);
      mutate(); // Refresh data after killing watcher
      return result;
    },
    restartWatcher: async (processId: string) => {
      const result = await restartWatcher(processId);
      mutate(); // Refresh data after restarting watcher
      return result;
    },
    startWatcher: async (folderPath: string, projectName?: string) => {
      const result = await startWatcher(folderPath, projectName);
      mutate(); // Refresh data after starting watcher
      return result;
    },
  };
}
