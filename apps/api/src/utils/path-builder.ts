import path from 'path';

/**
 * Builds a full project path using the USER_MOUNT environment variable
 * and the project ID
 *
 * @param projectId Project ID from the request
 * @returns Full path to the project
 */
export function buildProjectPath(projectId: string, ...args: string[]): string {
  const userMount = process.env.USER_MOUNT || '';

  if (!userMount) {
    throw new Error('USER_MOUNT environment variable is not set');
  }

  return path.join(userMount, projectId, ...args);
}

export default buildProjectPath;
