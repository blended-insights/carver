import { createApiClient } from '../utils/create-api-client';
import type { Folder } from '../../types/api';

// Create the watcher API client
const foldersApiClient = createApiClient('watcher');

/**
 * Retrieves all available folders
 */
export async function getFolders(): Promise<Folder[]> {
  const response = await foldersApiClient.get('/folders');
  return response.data.data;
}
