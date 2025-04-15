import { createApiClient } from '../utils/create-api-client';
import type { ProjectFile } from '../../types/api';

// Create the watcher API client
const projectsApiClient = createApiClient('watcher');

/**
 * Retrieves files for a specific project
 *
 * @param projectName Name of the project to get files for
 */
export async function getProjectFiles(
  projectName: string
): Promise<ProjectFile[]> {
  const response = await projectsApiClient.get(
    `/projects/${encodeURIComponent(projectName)}/files`
  );
  return response.data.data;
}

/**
 * Searches for files in a project based on a search term
 *
 * @param projectName Name of the project to search within
 * @param searchTerm Term to search for
 */
export async function searchProjectFiles(
  projectName: string,
  searchTerm: string
): Promise<ProjectFile[]> {
  const response = await projectsApiClient.get(
    `/project/${encodeURIComponent(
      projectName
    )}/search?term=${encodeURIComponent(searchTerm)}`
  );
  return response.data.data;
}
