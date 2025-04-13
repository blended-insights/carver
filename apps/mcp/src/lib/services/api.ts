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
 * Git status response
 */
interface GitStatus {
  current: string;
  tracking?: string;
  files: Array<{
    path: string;
    working_dir?: string;
    index?: string;
  }>;
  not_added: string[];
  conflicted: string[];
  created: string[];
  deleted: string[];
  modified: string[];
  renamed: string[];
  staged: string[];
  ahead: number;
  behind: number;
  // Other properties from simple-git
}

/**
 * Git commit response
 */
interface GitCommit {
  commit: string;
  message: string;
  author_name: string;
  author_email: string;
  date: string;
  // Other properties from simple-git
}

/**
 * Git log response
 */
interface GitLog {
  latest: GitCommit;
  all: GitCommit[];
  total: number;
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
 * Parameters for getGitStatus
 */
type GetGitStatusParams = BaseParams

/**
 * Parameters for gitAddFiles
 */
interface GitAddFilesParams extends BaseParams {
  files: string[];
}

/**
 * Parameters for gitCommit
 */
interface GitCommitParams extends BaseParams {
  message: string;
}

/**
 * Parameters for gitDiff
 */
type GitDiffParams = BaseParams

/**
 * Parameters for gitDiffStaged
 */
type GitDiffStagedParams = BaseParams

/**
 * Parameters for gitLog
 */
interface GitLogParams extends BaseParams {
  maxCount?: number;
}

/**
 * Parameters for gitCreateBranch
 */
interface GitCreateBranchParams extends BaseParams {
  branchName: string;
  baseBranch?: string;
}

/**
 * Parameters for gitCheckout
 */
interface GitCheckoutParams extends BaseParams {
  branchName: string;
}

/**
 * Parameters for gitReset
 */
type GitResetParams = BaseParams

/**
 * Parameters for gitShow
 */
interface GitShowParams extends BaseParams {
  revision: string;
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

  // Git-related methods

  /**
   * Get the git status of a project
   * @param params Parameters for getGitStatus
   * @returns Git status information
   */
  async getGitStatus({ projectName }: GetGitStatusParams): Promise<GitStatus> {
    try {
      const response = await this.client.get<ApiResponse<GitStatus>>(
        `/projects/${projectName}/git/status`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get git status');
    } catch (error) {
      console.error(`Error getting git status for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Add files to git staging
   * @param params Parameters for gitAddFiles
   * @returns Result of the add operation
   */
  async gitAddFiles({ projectName, files }: GitAddFilesParams): Promise<unknown> {
    try {
      const response = await this.client.post<ApiResponse<unknown>>(
        `/projects/${projectName}/git/add`,
        { files }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to add files to git');
    } catch (error) {
      console.error(`Error adding files to git for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Create a git commit
   * @param params Parameters for gitCommit
   * @returns Result of the commit operation
   */
  async gitCommit({ projectName, message }: GitCommitParams): Promise<unknown> {
    try {
      const response = await this.client.post<ApiResponse<unknown>>(
        `/projects/${projectName}/git/commits`,
        { message }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to commit changes');
    } catch (error) {
      console.error(`Error committing changes for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Get git diff (unstaged changes)
   * @param params Parameters for gitDiff
   * @returns Diff output
   */
  async gitDiff({ projectName }: GitDiffParams): Promise<string> {
    try {
      const response = await this.client.get<ApiResponse<string>>(
        `/projects/${projectName}/git/diff`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get git diff');
    } catch (error) {
      console.error(`Error getting git diff for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Get git diff for staged changes
   * @param params Parameters for gitDiffStaged
   * @returns Diff output
   */
  async gitDiffStaged({ projectName }: GitDiffStagedParams): Promise<string> {
    try {
      const response = await this.client.get<ApiResponse<string>>(
        `/projects/${projectName}/git/diff/staged`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get git staged diff');
    } catch (error) {
      console.error(`Error getting git staged diff for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Get git commit logs
   * @param params Parameters for gitLog
   * @returns Commit log information
   */
  async gitLog({ projectName, maxCount = 10 }: GitLogParams): Promise<GitLog> {
    try {
      const response = await this.client.get<ApiResponse<GitLog>>(
        `/projects/${projectName}/git/logs`,
        { params: { maxCount } }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get git logs');
    } catch (error) {
      console.error(`Error getting git logs for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new git branch
   * @param params Parameters for gitCreateBranch
   * @returns Result of the branch creation
   */
  async gitCreateBranch({
    projectName,
    branchName,
    baseBranch,
  }: GitCreateBranchParams): Promise<unknown> {
    try {
      const payload: { name: string; baseBranch?: string } = {
        name: branchName,
      };

      if (baseBranch) {
        payload.baseBranch = baseBranch;
      }

      const response = await this.client.post<ApiResponse<unknown>>(
        `/projects/${projectName}/git/branches`,
        payload
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to create git branch');
    } catch (error) {
      console.error(`Error creating git branch for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Checkout a git branch
   * @param params Parameters for gitCheckout
   * @returns Result of the checkout operation
   */
  async gitCheckout({
    projectName,
    branchName,
  }: GitCheckoutParams): Promise<unknown> {
    try {
      const response = await this.client.post<ApiResponse<unknown>>(
        `/projects/${projectName}/git/branches/${branchName}`,
        {}
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to checkout git branch');
    } catch (error) {
      console.error(`Error checking out git branch for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Reset all staged changes
   * @param params Parameters for gitReset
   * @returns Result of the reset operation
   */
  async gitReset({ projectName }: GitResetParams): Promise<unknown> {
    try {
      const response = await this.client.post<ApiResponse<unknown>>(
        `/projects/${projectName}/git/reset`,
        {}
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to reset git index');
    } catch (error) {
      console.error(`Error resetting git index for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Show a specific commit
   * @param params Parameters for gitShow
   * @returns Commit information
   */
  async gitShow({ projectName, revision }: GitShowParams): Promise<string> {
    try {
      const response = await this.client.get<ApiResponse<string>>(
        `/projects/${projectName}/git/commits/${revision}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to show git commit');
    } catch (error) {
      console.error(`Error showing git commit for ${projectName}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance of the API client
let apiClient: CarverApiClient | null = null;

/**
 * Get the API client singleton instance
 * @param host Optional host override
 * @param port Optional port override
 * @returns CarverApiClient instance
 */
export function getApiClient(host?: string, port?: number): CarverApiClient {
  if (!apiClient) {
    apiClient = new CarverApiClient(host, port);
  }
  return apiClient;
}

/**
 * Set the API client singleton instance (useful for testing)
 * @param client CarverApiClient instance
 */
export function setApiClient(client: CarverApiClient): void {
  apiClient = client;
}

/**
 * Initialize API client with configuration
 * @param host Optional host override
 * @param port Optional port override
 */
export function initializeApiClient(host?: string, port?: number): void {
  apiClient = new CarverApiClient(host, port);
}
