import { createApiClient } from '../utils/create-api-client';

// Create the admin API client
const dangerApiClient = createApiClient('admin');

/**
 * Response type for danger zone actions
 */
export interface DangerActionResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * Available danger zone actions
 */
export type DangerAction = 'flush-redis' | 'clear-neo4j' | 'clear-all';

/**
 * Executes a danger zone action via the admin API
 *
 * @param action The action to execute
 * @returns Promise with the action result
 */
export async function executeDangerAction(
  action: DangerAction
): Promise<DangerActionResponse> {
  const response = await dangerApiClient.post('/danger', { action });
  return response.data;
}
