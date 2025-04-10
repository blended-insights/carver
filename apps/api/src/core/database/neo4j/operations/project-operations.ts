import { getNeo4jClient } from '../client';
import { PROJECT_QUERIES } from '@/constants/neo4j-queries';
import logger from '@/utils/logger';

/**
 * Operations for managing projects in Neo4j
 */
export class ProjectOperations {
  /**
   * Create or get a project node
   * @param projectName Project name
   * @param rootPath Project root path
   */
  async createOrGetProject(
    projectName: string,
    rootPath: string
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(PROJECT_QUERIES.CREATE_OR_GET_PROJECT, {
          name: projectName,
          rootPath: rootPath,
        });
      } catch (error) {
        logger.error(
          `Error creating or getting project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Create a new version node
   * @param versionName Version name
   * @param projectName Project name
   */
  async createVersion(versionName: string, projectName: string): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(PROJECT_QUERIES.CREATE_VERSION, {
          versionName,
          projectName,
        });
      } catch (error) {
        logger.error(`Error creating version ${versionName}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get the latest version name for a project
   * @param projectName Project name
   * @returns Latest version name or null if no version exists
   */
  async getLatestVersionName(projectName: string): Promise<string | null> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        const result = await session.run(PROJECT_QUERIES.GET_LATEST_VERSION, {
          projectName,
        });

        if (result.records.length > 0) {
          return result.records[0].get('versionName');
        }

        return null;
      } catch (error) {
        logger.error(
          `Error getting latest version for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Get a project by name with metadata
   * @param projectName Project name to find
   * @returns Project object with id, name, path, fileCount, and lastUpdated or null if not found
   */
  async getProjectByName(projectName: string): Promise<{
    id: string;
    name: string;
    path: string;
    fileCount: number;
    lastUpdated: string | null;
  } | null> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(`Getting project by name: ${projectName}`);
        const result = await session.run(PROJECT_QUERIES.GET_PROJECT_BY_NAME, {
          projectName,
        });

        if (result.records.length === 0) {
          return null;
        }

        const record = result.records[0];
        return {
          id: record.get('id'),
          name: record.get('name'),
          path: record.get('path'),
          fileCount: record.get('fileCount').toNumber(), // Convert Neo4j Integer to JS number
          lastUpdated: record.get('lastUpdated'),
        };
      } catch (error) {
        logger.error(`Error getting project by name ${projectName}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get all projects with metadata
   * @returns Array of project objects with id, name, path, fileCount, and lastUpdated
   */
  async getAllProjects(): Promise<
    Array<{
      id: string;
      name: string;
      path: string;
      fileCount: number;
      lastUpdated: string | null;
    }>
  > {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug('Getting all projects');
        const result = await session.run(PROJECT_QUERIES.GET_ALL_PROJECTS);

        return result.records.map((record) => ({
          id: record.get('id'),
          name: record.get('name'),
          path: record.get('path'),
          fileCount: record.get('fileCount').toNumber(), // Convert Neo4j Integer to JS number
          lastUpdated: record.get('lastUpdated'),
        }));
      } catch (error) {
        logger.error('Error getting all projects:', error);
        throw error;
      }
    });
  }
}

// Export singleton instance
export const projectOperations = new ProjectOperations();
