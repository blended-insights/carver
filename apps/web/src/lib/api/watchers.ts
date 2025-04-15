import { createApiClient } from '../utils/create-api-client';
import type {
  Watcher,
  StartWatcherResponse,
  KillWatcherResponse,
  RestartWatcherResponse,
} from '../../types/api';

// Create the watcher API client
const watchersApiClient = createApiClient('watcher');

/**
 * Retrieves all active watchers
 */
export async function getWatchers(): Promise<Watcher[]> {
  const response = await watchersApiClient.get('/watchers');
  return response.data.data;
}

/**
 * Retrieves a specific watcher by its process ID
 *
 * @param processId The process ID of the watcher
 */
export async function getWatcherByProcessId(
  processId: string
): Promise<Watcher> {
  const response = await watchersApiClient.get(
    `/watchers/${encodeURIComponent(processId)}`
  );
  return response.data.data;
}

/**
 * Starts a new watcher for a specified folder
 *
 * @param folderPath Path to the folder to watch
 * @param projectName Optional project name to associate with this watcher
 */
export async function startWatcher(
  folderPath: string,
  projectName?: string
): Promise<StartWatcherResponse> {
  const url = projectName
    ? `/folders/${encodeURIComponent(
        folderPath
      )}/start?project=${encodeURIComponent(projectName)}`
    : `/folders/${encodeURIComponent(folderPath)}/start`;

  const response = await watchersApiClient.post(url);
  return response.data.data;
}

/**
 * Kills an active watcher process
 *
 * @param processId The process ID of the watcher to kill
 */
export async function killWatcher(
  processId: string
): Promise<KillWatcherResponse> {
  const response = await watchersApiClient.post(
    `/watchers/${encodeURIComponent(processId)}/kill`
  );
  return response.data.data;
}

/**
 * Restarts a watcher process
 *
 * @param processId The process ID of the watcher to restart
 */
export async function restartWatcher(
  processId: string
): Promise<RestartWatcherResponse> {
  const response = await watchersApiClient.post(
    `/watchers/${encodeURIComponent(processId)}/restart`
  );
  return response.data.data;
}
