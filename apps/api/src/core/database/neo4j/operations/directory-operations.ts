import { getNeo4jClient } from '../client';
import { DIRECTORY_QUERIES } from '@/constants/neo4j-queries';
import logger from '@/utils/logger';

/**
 * Operations for managing directories in Neo4j
 */
export class DirectoryOperations {
  /**
   * Create a directory node in Neo4j
   * @param dirPath Directory path relative to project root
   * @param dirName Directory name
   * @param projectName Project name
   */
  async createDirectoryNode(
    dirPath: string,
    dirName: string,
    projectName: string
  ): Promise<void> {
    const client = getNeo4jClient();
    logger.debug(
      `Creating directory node: path=${dirPath}, name=${dirName}, project=${projectName}`
    );
    return client.executeInSession(async (session) => {
      try {
        await session.run(DIRECTORY_QUERIES.CREATE_DIRECTORY_NODE, {
          path: dirPath,
          name: dirName,
          projectName,
        });
        logger.debug(`Successfully created directory node for: ${dirPath}`);
      } catch (error) {
        logger.error(`Error creating directory node for ${dirPath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create a parent-child relationship between directories
   * @param parentPath Parent directory path
   * @param childPath Child directory path
   */
  async createDirectoryRelationship(
    parentPath: string,
    childPath: string
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(DIRECTORY_QUERIES.CREATE_DIRECTORY_RELATIONSHIP, {
          parentPath,
          childPath,
        });
      } catch (error) {
        logger.error(
          `Error creating directory relationship between ${parentPath} and ${childPath}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Get directories for a specific project from Neo4j
   * @param projectName Project name
   * @returns Array of directory objects for the specified project
   */
  async getDirectoriesByProject(
    projectName: string
  ): Promise<{ path: string; name: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(`Getting directories for project: ${projectName}`);
        const result = await session.run(
          DIRECTORY_QUERIES.GET_DIRECTORIES_BY_PROJECT,
          {
            projectName,
          }
        );

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
        }));
      } catch (error) {
        logger.error(
          `Error getting directories for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Search directories for a specific project by search term
   * @param projectName Project name
   * @param searchTerm Search term to filter directories
   * @returns Array of matching directory objects for the specified project
   */
  async searchDirectoriesByProject(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Searching directories for project: ${projectName} with term: ${searchTerm}`
        );
        const result = await session.run(
          DIRECTORY_QUERIES.SEARCH_DIRECTORIES_BY_PROJECT,
          {
            projectName,
            searchTerm,
          }
        );

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
        }));
      } catch (error) {
        logger.error(
          `Error searching directories for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Get a specific directory by its path
   * @param projectName Project name
   * @param dirPath Directory path
   * @returns Directory object or null if not found
   */
  async getDirectoryByPath(
    projectName: string,
    dirPath: string
  ): Promise<{ path: string; name: string } | null> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Getting directory by path: ${dirPath} for project: ${projectName}`
        );
        const result = await session.run(
          DIRECTORY_QUERIES.GET_DIRECTORY_BY_PATH,
          {
            projectName,
            dirPath,
          }
        );

        if (result.records.length === 0) {
          return null;
        }

        const record = result.records[0];
        return {
          path: record.get('path'),
          name: record.get('name'),
        };
      } catch (error) {
        logger.error(`Error getting directory ${dirPath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get all files in a specific directory
   * @param projectName Project name
   * @param dirPath Directory path
   * @returns Array of file objects contained in the specified directory
   */
  async getFilesByDirectory(
    projectName: string,
    dirPath: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Getting files in directory: ${dirPath} for project: ${projectName}`
        );
        const result = await session.run(
          DIRECTORY_QUERIES.GET_FILES_BY_DIRECTORY,
          {
            projectName,
            dirPath,
          }
        );

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
          extension: record.get('extension'),
        }));
      } catch (error) {
        logger.error(`Error getting files in directory ${dirPath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get all items (directories and files) in a specific directory
   * @param projectName Project name
   * @param dirPath Directory path
   * @returns Array of items (directories and files) contained in the specified directory
   */
  async getItemsByDirectory(
    projectName: string,
    dirPath: string
  ): Promise<
    {
      path: string;
      name: string;
      type: 'directory' | 'file';
      extension?: string;
    }[]
  > {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Getting items in directory: ${dirPath} for project: ${projectName}`
        );
        const result = await session.run(
          DIRECTORY_QUERIES.GET_ITEMS_BY_DIRECTORY,
          {
            projectName,
            dirPath,
          }
        );

        return result.records.map((record) => {
          // Get the type directly from the record
          const type = record.get('type');

          // Validate that the type is either 'directory' or 'file'
          if (type !== 'directory' && type !== 'file') {
            logger.warn(
              `Invalid item type "${type}" found for path: ${record.get(
                'path'
              )}`
            );
          }

          const item = {
            path: record.get('path'),
            name: record.get('name'),
            type: record.get('type'),
            extension: record.get('extension'),
          };

          // Remove extension if it's undefined (for directories)
          if (item.extension === undefined) {
            delete item.extension;
          }

          return item;
        });
      } catch (error) {
        logger.error(`Error getting items in directory ${dirPath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get all items (directories and files) at the root level of a project
   * @param projectName Project name
   * @returns Array of items (directories and files) at the root level of the project
   */
  async getRootItemsByProject(projectName: string): Promise<
    {
      path: string;
      name: string;
      type: 'directory' | 'file';
      extension?: string;
    }[]
  > {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(`Getting root items for project: ${projectName}`);
        const result = await session.run(
          DIRECTORY_QUERIES.GET_ROOT_ITEMS_BY_PROJECT,
          {
            projectName,
          }
        );

        return result.records.map((record) => {
          const item = {
            path: record.get('path'),
            name: record.get('name'),
            type: record.get('type') as 'directory' | 'file',
            extension: record.get('extension') || undefined,
          };

          // Remove extension if it's undefined (for directories)
          if (item.extension === undefined) {
            delete item.extension;
          }

          return item;
        });
      } catch (error) {
        logger.error(
          `Error getting root items for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Get the entire directory tree for a specific directory
   * @param projectName Project name
   * @param dirPath Directory path
   * @returns Array of items in the directory tree with their parent paths
   */
  async getDirectoryTreeByPath(
    projectName: string,
    dirPath: string
  ): Promise<
    {
      path: string;
      name: string;
      type: 'directory' | 'file';
      extension?: string;
    }[]
  > {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Getting directory tree for: ${dirPath} in project: ${projectName}`
        );
        const result = await session.run(
          DIRECTORY_QUERIES.GET_DIRECTORY_TREE_BY_PATH,
          {
            projectName,
            dirPath,
          }
        );

        return result.records.map((record) => {
          const item = {
            path: record.get('path'),
            name: record.get('name'),
            type: record.get('type') as 'directory' | 'file',
            extension: record.get('extension') || undefined,
          };

          // Remove properties that are undefined
          if (item.extension === undefined) {
            delete item.extension;
          }

          return item;
        });
      } catch (error) {
        logger.error(`Error getting directory tree for ${dirPath}:`, error);
        throw error;
      }
    });
  }
}

// Export singleton instance
export const directoryOperations = new DirectoryOperations();
