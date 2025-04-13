import { isAxiosError } from 'axios';
import { ApiError, CarverApiClient } from './client';
import { 
  GetProjectFilesParams, 
  ProjectFile, 
  GetProjectFileParams, 
  ProjectFileContent,
  GetFileImportsParams,
  FileImports,
  WriteProjectFileParams,
  WriteFileResponse,
  UpdateProjectFileParams,
  PatchProjectFileParams
} from './types';

/**
 * FileApiClient - Handles all file-related API operations
 */
export class FileApiClient {
  private client: CarverApiClient;

  /**
   * Creates a new FileApiClient
   * @param apiClient The CarverApiClient instance
   */
  constructor(apiClient: CarverApiClient) {
    this.client = apiClient;
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
    const queryParams: Record<string, string> = {};

    // Add search parameters if provided
    if (searchTerm) {
      queryParams.search = searchTerm;
      if (searchType) {
        queryParams.type = searchType;
      }
    }

    try {
      return await this.client.get<ProjectFile[]>(
        `/projects/${projectName}/files`,
        queryParams
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      
      // Transform the error to provide context about the operation
      const apiError = new ApiError(
        `Failed to get files for project ${projectName}`,
        isAxiosError(error) ? error : undefined
      );
      
      throw apiError;
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
    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

    try {
      return await this.client.get<ProjectFileContent>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        { fields: fields.join(',') }
      );
    } catch (error) {
      // Transform error to provide better context
      const apiError = new ApiError(
        `Failed to get file ${filePath}`, 
        isAxiosError(error) ? error : undefined
      );
      
      throw apiError;
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
    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

    try {
      const imports = await this.client.get<string[]>(
        `/projects/${projectName}/files/${encodedFilePath}/imports`
      );

      // Convert the array of strings to a FileImports object
      return { imports };
    } catch (error) {
      const apiError = new ApiError(
        `Failed to get imports for file ${filePath}`,
        isAxiosError(error) ? error : undefined
      );
      
      throw apiError;
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
    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

    try {
      return await this.client.post<WriteFileResponse>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        { content }
      );
    } catch (error) {
      const apiError = new ApiError(
        `Failed to write file ${filePath}`,
        isAxiosError(error) ? error : undefined
      );
      
      throw apiError;
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
    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

    try {
      return await this.client.put<WriteFileResponse>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        { oldText, newText }
      );
    } catch (error) {
      const apiError = new ApiError(
        `Failed to update file ${filePath}`,
        isAxiosError(error) ? error : undefined
      );
      
      throw apiError;
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
    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

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

    try {
      return await this.client.patch<WriteFileResponse>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        payload
      );
    } catch (error) {
      const apiError = new ApiError(
        `Failed to patch file ${filePath}`,
        isAxiosError(error) ? error : undefined
      );
      
      throw apiError;
    }
  }
}
