import useSWR, { SWRConfiguration } from 'swr';
import { getProjectFiles, searchProjectFiles } from '../api/projects';
import type { ProjectFile } from '@/types/api';

/**
 * Hook for fetching files for a specific project
 * 
 * @param projectName The name of the project
 * @param config Optional SWR configuration
 */
export function useProjectFiles(projectName: string | null, config?: SWRConfiguration) {
  // Only fetch if projectName exists
  const shouldFetch = projectName !== null && projectName !== '';
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectFile[]>(
    shouldFetch ? `project-files-${projectName}` : null,
    () => shouldFetch ? getProjectFiles(projectName) : [],
    {
      revalidateOnMount: true,
      ...config
    }
  );

  return {
    files: data || [],
    error,
    isLoading,
    isValidating,
    mutate
  };
}

/**
 * Hook for searching files in a project
 * 
 * @param projectName The name of the project
 * @param searchTerm The search term to filter files by
 * @param config Optional SWR configuration
 */
export function useSearchProjectFiles(
  projectName: string | null,
  searchTerm: string | null,
  config?: SWRConfiguration
) {
  // Only perform the search if both projectName and searchTerm exist and searchTerm is at least 2 chars
  const shouldSearch = 
    projectName !== null && 
    searchTerm !== null && 
    projectName !== '' && 
    searchTerm.length >= 2;
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectFile[]>(
    shouldSearch ? `project-search-${projectName}-${searchTerm}` : null,
    () => shouldSearch ? searchProjectFiles(projectName, searchTerm) : [],
    {
      dedupingInterval: 2000,
      ...config
    }
  );

  return {
    files: data || [],
    error,
    isLoading: shouldSearch ? isLoading : false,
    isValidating,
    mutate
  };
}
