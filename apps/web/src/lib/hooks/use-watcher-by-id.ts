import useSWR, { SWRConfiguration } from 'swr';
import {
  getWatcherByProcessId,
  killWatcher,
  restartWatcher,
} from '../api/watchers';
import type { Watcher } from '@/types/api';

/**
 * Hook for fetching and managing a single watcher process
 *
 * @param processId The process ID of the watcher
 * @param config Optional SWR configuration
 */
export function useWatcherById(
  processId: string | null,
  config?: SWRConfiguration
) {
  // Only fetch if processId exists
  const shouldFetch = processId !== null && processId !== '';

  const { data, error, isLoading, isValidating, mutate } = useSWR<Watcher>(
    shouldFetch ? `watcher-${processId}` : null,
    shouldFetch ? () => getWatcherByProcessId(processId) : null,
    {
      revalidateOnMount: true,
      ...config,
    }
  );

  return {
    watcher: data,
    error,
    isLoading,
    isValidating,
    mutate,

    // Action methods with automatic data revalidation
    killWatcher: async () => {
      if (!processId) throw new Error('No process ID provided');
      const result = await killWatcher(processId);
      mutate();
      return result;
    },
    restartWatcher: async () => {
      if (!processId) throw new Error('No process ID provided');
      const result = await restartWatcher(processId);
      mutate();
      return result;
    },
  };
}
