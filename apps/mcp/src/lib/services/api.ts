import {
  create,
  isAxiosError,
  type AxiosInstance,
} from 'axios';

/**
 * Type definition for API response structure
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * File imports structure
 */
interface FileImports {
  imports: string[];
}

/**
 * Folder tree item structure
 */
interface FolderTreeItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FolderTreeItem[];
}

/**
 * Project data structure
 */
interface Project {
  id: string;
  name: string;
  path: string;
  fileCount: number;
  lastUpdated: string;
}

/**
 * Project file data types
 */
interface ProjectFile {
  path: string;
  name: string;
  extension: string;
}

/**
 * Project folder data types
 */
interface ProjectFolder {
  path: string;
  name: string;
}

/**
 * Project file content response - fields configurable based on request
 */
interface ProjectFileContent {
  content?: string;
  hash?: string;
  lastModified?: string;
}

/**
 * Write file response data structure
 */
interface WriteFileResponse {
  jobId: string;
  path: string;
}

/**
 * Carver API client
 */
export class CarverApiClient {
  private client: AxiosInstance;

  /**
   * Creates a new API client instance
   * @param baseURL The base URL for the API (defaults to localhost:4000)
   * @param config Additional Axios configuration options
   * @param host Optional host override (defaults to localhost)
   * @param port Optional port override (defaults to 4000)
   */
  constructor(host?: string, port?: number) {
    // If host and port are provided, construct baseURL from them
    const apiHost = host || 'localhost';
    const apiPort = port || 4000;
    const baseURL = `http://${apiHost}:${apiPort}`;

    // Create axios instance with default configuration
    this.client = create({
      baseURL,
      timeout: 10000, // 10 seconds timeout
      headers: { 'Content-Type': 'application/json' },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Log error details
        console.error('API request failed:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all available projects
   * @returns Array of project information
   */
  async getProjects(): Promise<Project[]> {
    try {
      const response = await this.client.get<ApiResponse<Project[]>>(
        '/projects'
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to retrieve projects');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Get all files for a project
   * @param projectId The project identifier
   * @param searchTerm Optional search term to filter files
   * @param searchType Optional search type (function, import, directory)
   * @returns Array of project files
   */
  async getProjectFiles(
    projectId: string,
    searchTerm?: string,
    searchType?: 'function' | 'import' | 'directory'
  ): Promise<ProjectFile[]> {
    try {
      const params: Record<string, string> = {};

      // Add search parameters if provided
      if (searchTerm) {
        params.search = searchTerm;
        if (searchType) {
          params.type = searchType;
        }
      }

      const response = await this.client.get<ApiResponse<ProjectFile[]>>(
        `/projects/${projectId}/files`,
        { params }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(
        response.data.message || 'Failed to retrieve project files'
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
   * Get a specific file from a project with selected fields
   * @param projectId The project identifier
   * @param fileId The file path within the project
   * @param fields Array of fields to include (content, hash, lastModified)
   * @returns File content with requested fields
   */
  async getProjectFile(
    projectId: string,
    fileId: string,
    fields: Array<'content' | 'hash' | 'lastModified'> = [
      'content',
      'hash',
      'lastModified',
    ]
  ): Promise<ProjectFileContent> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedFileId = encodeURIComponent(fileId);

      const response = await this.client.get<ApiResponse<ProjectFileContent>>(
        `/projects/${projectId}/files/${encodedFileId}`,
        { params: { fields: fields.join(',') } }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to retrieve file');
    } catch (error) {
      // Rethrow the error for handling by the caller
      console.error('Error fetching file:', error);
      throw error;
    }
  }

  /**
   * Get imports for a specific file from a project
   * @param projectId The project identifier
   * @param fileId The file path within the project
   * @returns FileImports object containing an array of import sources
   */
  async getFileImports(
    projectId: string,
    fileId: string
  ): Promise<FileImports> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedFileId = encodeURIComponent(fileId);

      const response = await this.client.get<ApiResponse<string[]>>(
        `/projects/${projectId}/files/${encodedFileId}/imports`
      );

      if (response.data.success && response.data.data) {
        // Convert the array of strings to a FileImports object
        return { imports: response.data.data };
      }

      throw new Error(
        response.data.message || 'Failed to retrieve file imports'
      );
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error fetching imports for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Write content to a file in a project
   * @param projectId The project identifier
   * @param fileId The file path within the project
   * @param content The content to write to the file
   * @returns WriteFileResponse object with job information
   */
  async writeProjectFile(
    projectId: string,
    fileId: string,
    content: string
  ): Promise<WriteFileResponse> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedFileId = encodeURIComponent(fileId);

      const response = await this.client.post<ApiResponse<WriteFileResponse>>(
        `/projects/${projectId}/files/${encodedFileId}`,
        { content }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to write file');
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error writing file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Update content of an existing file in a project (PUT method)
   * @param projectId The project identifier
   * @param fileId The file path within the project
   * @param content The new content to replace the existing file content
   * @returns WriteFileResponse object with job information
   */
  async updateProjectFile(
    projectId: string,
    fileId: string,
    oldText: string,
    newText: string
  ): Promise<WriteFileResponse> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedFileId = encodeURIComponent(fileId);

      const response = await this.client.put<ApiResponse<WriteFileResponse>>(
        `/projects/${projectId}/files/${encodedFileId}`,
        { oldText, newText }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to update file');
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error updating file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get all folders for a project
   * @param projectId The project identifier
   * @param searchTerm Optional search term to filter folders
   * @returns Array of project folders
   */
  async getProjectFolders(
    projectId: string,
    searchTerm?: string
  ): Promise<ProjectFolder[]> {
    try {
      const params: Record<string, string> = {};

      // Add search parameter if provided
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await this.client.get<ApiResponse<ProjectFolder[]>>(
        `/projects/${projectId}/folders`,
        { params }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(
        response.data.message || 'Failed to retrieve project folders'
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
   * @param projectId The project identifier
   * @param folderId The folder path within the project
   * @returns Folder information or null if not found
   */
  async getProjectFolder(
    projectId: string,
    folderId: string
  ): Promise<ProjectFolder | null> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderId = encodeURIComponent(folderId);

      const response = await this.client.get<ApiResponse<ProjectFolder>>(
        `/projects/${projectId}/folders/${encodedFolderId}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to retrieve folder');
    } catch (error) {
      // Return null for 404 errors (folder not found)
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching folder ${folderId}:`, error);
      throw error;
    }
  }

  /**
   * Get all files in a specific folder
   * @param projectId The project identifier
   * @param folderId The folder path within the project
   * @returns Array of project files in the folder
   */
  async getFilesInFolder(
    projectId: string,
    folderId: string
  ): Promise<ProjectFile[]> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderId = encodeURIComponent(folderId);

      const response = await this.client.get<ApiResponse<ProjectFile[]>>(
        `/projects/${projectId}/folders/${encodedFolderId}/files`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(
        response.data.message || 'Failed to retrieve files in folder'
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      console.error(`Error fetching files in folder ${folderId}:`, error);
      throw error;
    }
  }

  /**
   * Get all items (files and folders) in a specific folder
   * @param projectId The project identifier
   * @param folderId The folder path within the project
   * @returns Array of project files and folders in the folder
   */
  async getFolderItems(
    projectId: string,
    folderId: string
  ): Promise<Array<ProjectFile | ProjectFolder>> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderId = encodeURIComponent(folderId);

      const response = await this.client.get<
        ApiResponse<Array<ProjectFile | ProjectFolder>>
      >(`/projects/${projectId}/folders/${encodedFolderId}/items`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(
        response.data.message || 'Failed to retrieve folder items'
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      console.error(`Error fetching items in folder ${folderId}:`, error);
      throw error;
    }
  }

  /**
   * Get a recursive tree view of a specific folder
   * @param projectId The project identifier
   * @param folderId The folder path within the project
   * @param depth Optional maximum depth of recursion
   * @returns Recursive tree structure of folder contents
   */
  async getFolderTree(
    projectId: string,
    folderId: string,
    depth?: number
  ): Promise<FolderTreeItem> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedFolderId = encodeURIComponent(folderId);

      // Prepare query parameters
      const params: Record<string, string | number> = {};
      if (depth !== undefined) {
        params.depth = depth;
      }

      const response = await this.client.get<ApiResponse<FolderTreeItem>>(
        `/projects/${projectId}/folders/${encodedFolderId}/tree`,
        { params }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(
        response.data.message || 'Failed to retrieve folder tree'
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return a minimal empty tree structure for not found
        return {
          name: folderId,
          type: 'directory',
          path: folderId,
          children: [],
        };
      }
      console.error(`Error fetching tree for folder ${folderId}:`, error);
      throw error;
    }
  }
}
