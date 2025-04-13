import { create, isAxiosError, type AxiosInstance } from 'axios';

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
 * Base parameters for API requests
 */
interface BaseParams {
  projectName: string;
}

/**
 * Parameters for getProjectFiles
 */
interface GetProjectFilesParams extends BaseParams {
  searchTerm?: string;
  searchType?: 'function' | 'import' | 'directory';
}

/**
 * Parameters for getProjectFile
 */
interface GetProjectFileParams extends BaseParams {
  filePath: string;
  fields?: Array<'content' | 'hash' | 'lastModified'>;
}

/**
 * Parameters for getFileImports
 */
interface GetFileImportsParams extends BaseParams {
  filePath: string;
}

/**
 * Parameters for writeProjectFile
 */
interface WriteProjectFileParams extends BaseParams {
  filePath: string;
  content: string;
}

/**
 * Parameters for updateProjectFile
 */
interface UpdateProjectFileParams extends BaseParams {
  filePath: string;
  oldText: string;
  newText: string;
}

/**
 * Parameters for getProjectFolders
 */
interface GetProjectFoldersParams extends BaseParams {
  searchTerm?: string;
}

/**
 * Parameters for getProjectFolder
 */
interface GetProjectFolderParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for getFilesInFolder
 */
interface GetFilesInFolderParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for getFolderItems
 */
interface GetFolderItemsParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for getFolderTree
 */
interface GetFolderTreeParams extends BaseParams {
  folderPath: string;
  depth?: number;
}

/**
 * Parameters for createProjectFolder
 */
interface CreateProjectFolderParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for patchProjectFile
 */
export interface PatchProjectFileParams extends BaseParams {
  filePath: string;
  startLine: number;
  endLine?: number;
  newContent?: string;
  operation?: 'replace' | 'insert' | 'delete';
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
   * @param params Parameters for getProjectFiles
   * @returns Array of project files
   */
  async getProjectFiles({
    projectName,
    searchTerm,
    searchType,
  }: GetProjectFilesParams): Promise<ProjectFile[]> {
    try {
      const queryParams: Record<string, string> = {};

      // Add search parameters if provided
      if (searchTerm) {
        queryParams.search = searchTerm;
        if (searchType) {
          queryParams.type = searchType;
        }
      }

      const response = await this.client.get<ApiResponse<ProjectFile[]>>(
        `/projects/${projectName}/files`,
        { params: queryParams }
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
   * @param params Parameters for getProjectFile
   * @returns File content with requested fields
   */
  async getProjectFile({
    projectName,
    filePath,
    fields = ['content', 'hash', 'lastModified'],
  }: GetProjectFileParams): Promise<ProjectFileContent> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedfilePath = encodeURIComponent(filePath);

      const response = await this.client.get<ApiResponse<ProjectFileContent>>(
        `/projects/${projectName}/files/${encodedfilePath}`,
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
   * @param params Parameters for getFileImports
   * @returns FileImports object containing an array of import sources
   */
  async getFileImports({
    filePath,
    projectName,
  }: GetFileImportsParams): Promise<FileImports> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedfilePath = encodeURIComponent(filePath);

      const response = await this.client.get<ApiResponse<string[]>>(
        `/projects/${projectName}/files/${encodedfilePath}/imports`
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
      console.error(`Error fetching imports for file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write content to a file in a project
   * @param params Parameters for writeProjectFile
   * @returns WriteFileResponse object with job information
   */
  async writeProjectFile({
    projectName,
    filePath,
    content,
  }: WriteProjectFileParams): Promise<WriteFileResponse> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedfilePath = encodeURIComponent(filePath);

      const response = await this.client.post<ApiResponse<WriteFileResponse>>(
        `/projects/${projectName}/files/${encodedfilePath}`,
        { content }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to write file');
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Update content of an existing file in a project (PUT method)
   * @param params Parameters for updateProjectFile
   * @returns WriteFileResponse object with job information
   */
  async updateProjectFile({
    projectName,
    filePath,
    oldText,
    newText,
  }: UpdateProjectFileParams): Promise<WriteFileResponse> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedfilePath = encodeURIComponent(filePath);

      const response = await this.client.put<ApiResponse<WriteFileResponse>>(
        `/projects/${projectName}/files/${encodedfilePath}`,
        { oldText, newText }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to update file');
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error updating file ${filePath}:`, error);
      throw error;
    }
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

      const response = await this.client.get<ApiResponse<ProjectFolder[]>>(
        `/projects/${projectName}/folders`,
        { params: queryParams }
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
   * @param params Parameters for getProjectFolder
   * @returns Folder information or null if not found
   */
  async getProjectFolder({
    projectName,
    folderPath,
  }: GetProjectFolderParams): Promise<ProjectFolder | null> {
    try {
      // URL encode the folder path to handle special characters correctly
      const encodedfolderPath = encodeURIComponent(folderPath);

      const response = await this.client.get<ApiResponse<ProjectFolder>>(
        `/projects/${projectName}/folders/${encodedfolderPath}`
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
      const encodedfolderPath = encodeURIComponent(folderPath);

      const response = await this.client.get<ApiResponse<ProjectFile[]>>(
        `/projects/${projectName}/folders/${encodedfolderPath}/files`
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
      const encodedfolderPath = encodeURIComponent(folderPath);

      const response = await this.client.get<
        ApiResponse<Array<ProjectFile | ProjectFolder>>
      >(`/projects/${projectName}/folders/${encodedfolderPath}/items`);

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
      const encodedfolderPath = encodeURIComponent(folderPath);

      // Prepare query parameters
      const queryParams: Record<string, string | number> = {};
      if (depth !== undefined) {
        queryParams.depth = depth;
      }

      const response = await this.client.get<ApiResponse<FolderTreeItem>>(
        `/projects/${projectName}/folders/${encodedfolderPath}/tree`,
        { params: queryParams }
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
  }: CreateProjectFolderParams): Promise<{ jobId: string; path: string }> {
    try {
      const response = await this.client.post<
        ApiResponse<{ jobId: string; path: string }>
      >(`/projects/${projectName}/folders`, { folderPath });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to create folder');
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error creating folder ${folderPath}:`, error);
      throw error;
    }
  }

  /**
   * Update a file in a project using PATCH operations
   * @param params Parameters for patchProjectFile
   * @returns WriteFileResponse object with job information
   */
  async patchProjectFile({
    projectName,
    filePath,
    startLine,
    endLine,
    newContent,
    operation = 'replace',
  }: PatchProjectFileParams): Promise<WriteFileResponse> {
    try {
      // URL encode the file path to handle special characters correctly
      const encodedfilePath = encodeURIComponent(filePath);

      // Prepare the request payload
      const payload: {
        startLine: number;
        endLine?: number;
        newContent?: string;
        operation: 'replace' | 'insert' | 'delete';
      } = {
        startLine,
        operation,
      };

      // Add optional parameters as needed
      if (endLine !== undefined) {
        payload.endLine = endLine;
      }

      if (newContent !== undefined) {
        payload.newContent = newContent;
      }

      const response = await this.client.patch<ApiResponse<WriteFileResponse>>(
        `/projects/${projectName}/files/${encodedfilePath}`,
        payload
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to patch file');
    } catch (error) {
      // Log and rethrow the error for handling by the caller
      console.error(`Error patching file ${filePath}:`, error);
      throw error;
    }
  }
}
