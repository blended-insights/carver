import useSWR, { SWRConfiguration } from 'swr';
import { getFolders } from '../api/folders';
import { startWatcher } from '../api/watchers';
import type { Folder } from '@/types/api';

// SWR fetcher function for folders
const fetchFolders = () => getFolders();

/**
 * Hook for fetching and managing available folders
 *
 * @param config Optional SWR configuration
 */
export function useFolders(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Folder[]>(
    'folders',
    fetchFolders,
    {
      revalidateOnMount: true,
      revalidateIfStale: true,
      dedupingInterval: 0,
      ...config,
    }
  );

  return {
    folders: data || [],
    error,
    isLoading,
    isValidating,
    mutate,

    // Action for starting a watcher for a folder
    startWatcher: async (folderPath: string, projectName?: string) => {
      const result = await startWatcher(folderPath, projectName);
      mutate(); // Refresh folder data after starting a watcher
      return result;
    },
  };
}
