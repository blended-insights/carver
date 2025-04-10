import { getNeo4jClient } from '../client';
import { FILE_QUERIES } from '@/constants/neo4j-queries';
import logger from '@/utils/logger';

/**
 * Operations for managing files in Neo4j
 */
export class FileOperations {
  /**
   * Mark a file as deleted in the current version
   * @param filePath File path
   * @param versionName Version name
   */
  async markFileAsDeleted(
    filePath: string,
    versionName: string
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(FILE_QUERIES.MARK_FILE_AS_DELETED, {
          filePath,
          versionName,
        });
      } catch (error) {
        logger.error(`Error marking file ${filePath} as deleted:`, error);
        throw error;
      }
    });
  }

  /**
   * Create file's relationship to current version
   * @param filePath File path
   * @param versionName Version name
   */
  async createFileVersionRelationship(
    filePath: string,
    versionName: string
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(FILE_QUERIES.CREATE_FILE_VERSION_RELATIONSHIP, {
          filePath: filePath,
          versionName,
        });
      } catch (error) {
        logger.error(
          `Error creating file-version relationship for ${filePath}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Create a file node in Neo4j
   * @param filePath File path relative to project root
   * @param fileName File name
   * @param fileExtension File extension
   * @param dirPath Directory path that contains the file
   * @param projectName Project name
   */
  async createFileNode(
    filePath: string,
    fileName: string,
    fileExtension: string,
    dirPath: string,
    projectName: string
  ): Promise<void> {
    const client = getNeo4jClient();
    logger.debug(
      `Creating file node: path=${filePath}, name=${fileName}, extension=${fileExtension}, dirPath=${dirPath}, project=${projectName}`
    );
    return client.executeInSession(async (session) => {
      try {
        await session.run(FILE_QUERIES.CREATE_FILE_NODE, {
          path: filePath,
          name: fileName,
          extension: fileExtension,
          dirPath,
          projectName,
        });
        logger.debug(`Successfully created file node for: ${filePath}`);
      } catch (error) {
        logger.error(`Error creating file node for ${filePath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get all files from Neo4j
   * @returns Array of file objects
   */
  async getAllFiles(): Promise<
    { path: string; name: string; extension: string }[]
  > {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        const result = await session.run(FILE_QUERIES.GET_ALL_FILES);

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
          extension: record.get('extension'),
        }));
      } catch (error) {
        logger.error('Error getting all files:', error);
        throw error;
      }
    });
  }

  /**
   * Search files for a specific project by search term
   * @param projectName Project name
   * @param searchTerm Search term to filter files
   * @returns Array of matching file objects for the specified project
   */
  async searchFilesByProject(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Searching files for project: ${projectName} with term: ${searchTerm}`
        );
        const result = await session.run(FILE_QUERIES.SEARCH_FILES_BY_PROJECT, {
          projectName,
          searchTerm,
        });

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
          extension: record.get('extension'),
        }));
      } catch (error) {
        logger.error(
          `Error searching files for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Search files by function name for a specific project
   * @param projectName Project name
   * @param searchTerm Function name search term
   * @returns Array of matching file objects that define functions matching the search term
   */
  async searchFilesByFunction(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Searching files by function for project: ${projectName} with term: ${searchTerm}`
        );
        const result = await session.run(FILE_QUERIES.SEARCH_BY_FUNCTION, {
          projectName,
          searchTerm,
        });

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
          extension: record.get('extension'),
        }));
      } catch (error) {
        logger.error(
          `Error searching files by function for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Search files by import source for a specific project
   * @param projectName Project name
   * @param searchTerm Import source search term
   * @returns Array of matching file objects that import modules matching the search term
   */
  async searchFilesByImport(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Searching files by import for project: ${projectName} with term: ${searchTerm}`
        );
        const result = await session.run(FILE_QUERIES.SEARCH_BY_IMPORT, {
          projectName,
          searchTerm,
        });

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
          extension: record.get('extension'),
        }));
      } catch (error) {
        logger.error(
          `Error searching files by import for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Search files by directory name or path for a specific project
   * @param projectName Project name
   * @param searchTerm Directory name or path search term
   * @returns Array of matching file objects contained in directories matching the search term
   */
  async searchFilesByDirectory(
    projectName: string,
    searchTerm: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        logger.debug(
          `Searching files by directory for project: ${projectName} with term: ${searchTerm}`
        );
        const result = await session.run(FILE_QUERIES.SEARCH_BY_DIRECTORY, {
          projectName,
          searchTerm,
        });

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
          extension: record.get('extension'),
        }));
      } catch (error) {
        logger.error(
          `Error searching files by directory for project ${projectName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Get files for a specific project from Neo4j
   * @param projectName Project name
   * @returns Array of file objects for the specified project
   */
  async getFilesByProject(
    projectName: string
  ): Promise<{ path: string; name: string; extension: string }[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        const result = await session.run(FILE_QUERIES.GET_FILES_BY_PROJECT, {
          projectName,
        });

        return result.records.map((record) => ({
          path: record.get('path'),
          name: record.get('name'),
          extension: record.get('extension'),
        }));
      } catch (error) {
        logger.error(`Error getting files for project ${projectName}:`, error);
        throw error;
      }
    });
  }
}

// Export singleton instance
export const fileOperations = new FileOperations();
