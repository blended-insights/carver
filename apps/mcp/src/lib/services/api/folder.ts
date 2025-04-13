import { isAxiosError } from 'axios';
import { CarverApiClient } from './client';
import {
  GetProjectFoldersParams,
  ProjectFolder,
  GetProjectFolderParams,
  GetFilesInFolderParams,
  ProjectFile,
  GetFolderItemsParams,
  GetFolderTreeParams,
  FolderTreeItem,
  CreateProjectFolderParams,
  WriteFileResponse
} from './types';

/**
 * FolderApiClient - Handles all folder-related API operations
 */
export class FolderApiClient {
  private client: CarverApiClient;

  /**
   * Creates a new FolderApiClient
   * @param apiClient The CarverApiClient instance
   */
  constructor(apiClient: CarverApiClient) {
    this.client = apiClient;
  }

  /**
   * Get all folders for a project
   * @param params Parameters for getProjectFolders
   * @returns Array of project folders
   */
  async getProjectFolders({
    projectName,
    searchTerm,
  }: GetProjectFoldersParams): Promise<ProjectFolder[]> {
    try {
      const queryParams: Record<string, string> = {};

      // Add search parameter if provided
      if (searchTerm) {
        queryParams.search = searchTerm;
      }

      return await this.client.get<ProjectFolder[]>(
        `/projects/${projectName}/folders`,
        queryParams
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a specific folder from a project
   * @param params Parameters for getProjectFolder
   * @returns Folder information or null if not found
   */
  async getProjectFolder({
    projectName,
    folderPath,
  }: GetProjectFolderParams): Promise<ProjectFolder | null> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderPath = encodeURIComponent(folderPath);

      return await this.client.get<ProjectFolder>(
        `/projects/${projectName}/folders/${encodedFolderPath}`
      );
    } catch (error) {
      // Return null for 404 errors (folder not found)
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching folder ${folderPath}:`, error);
      throw error;
    }
  }

  /**
   * Get all files in a specific folder
   * @param params Parameters for getFilesInFolder
   * @returns Array of project files in the folder
   */
  async getFilesInFolder({
    projectName,
    folderPath,
  }: GetFilesInFolderParams): Promise<ProjectFile[]> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderPath = encodeURIComponent(folderPath);

      return await this.client.get<ProjectFile[]>(
        `/projects/${projectName}/folders/${encodedFolderPath}/files`
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      console.error(`Error fetching files in folder ${folderPath}:`, error);
      throw error;
    }
  }

  /**
   * Get all items (files and folders) in a specific folder
   * @param params Parameters for getFolderItems
   * @returns Array of project files and folders in the folder
   */
  async getFolderItems({
    projectName,
    folderPath,
  }: GetFolderItemsParams): Promise<Array<ProjectFile | ProjectFolder>> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderPath = encodeURIComponent(folderPath);

      return await this.client.get<Array<ProjectFile | ProjectFolder>>(
        `/projects/${projectName}/folders/${encodedFolderPath}/items`
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      console.error(`Error fetching items in folder ${folderPath}:`, error);
      throw error;
    }
  }

  /**
   * Get a recursive tree view of a specific folder
   * @param params Parameters for getFolderTree
   * @returns Recursive tree structure of folder contents
   */
  async getFolderTree({
    projectName,
    folderPath,
    depth,
  }: GetFolderTreeParams): Promise<FolderTreeItem> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderPath = encodeURIComponent(folderPath);

      // Prepare query parameters
      const queryParams: Record<string, string | number> = {};
      if (depth !== undefined) {
        queryParams.depth = depth;
      }

      return await this.client.get<FolderTreeItem>(
        `/projects/${projectName}/folders/${encodedFolderPath}/tree`,
        queryParams
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return a minimal empty tree structure for not found
        return {
          name: folderPath,
          type: 'directory',
          path: folderPath,
          children: [],
        };
      }
      console.error(`Error fetching tree for folder ${folderPath}:`, error);
      throw error;
    }
  }

  /**
   * Create a new folder in a project
   * @param params Parameters for createProjectFolder
   * @returns Job object with creation information
   */
  async createProjectFolder({
    projectName,
    folderPath,
  }: CreateProjectFolderParams): Promise<WriteFileResponse> {
    try {
      return await this.client.post<WriteFileResponse>(
        `/projects/${projectName}/folders`,
        { folderPath }
      );
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error creating folder ${folderPath}:`, error);
      throw error;
    }
  }
}
