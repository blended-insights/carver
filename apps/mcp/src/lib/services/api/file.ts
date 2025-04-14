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
  PatchProjectFileParams,
} from './types';
import {
  ApiCache,
  CacheOptions,
  FileCacheKeys,
} from './cache';
import { logger } from '@/lib/logger';

/**
 * FileApiClient - Handles all file-related API operations
 */
export class FileApiClient {
  private client: CarverApiClient;
  private cache: ApiCache;

  /**
   * Creates a new FileApiClient
   * @param apiClient The CarverApiClient instance
   * @param cacheOptions Optional cache configuration
   */
  constructor(
    apiClient: CarverApiClient,
    cacheOptions?: Partial<CacheOptions>
  ) {
    this.client = apiClient;
    this.cache = new ApiCache(cacheOptions);
  }

  /**
   * Configure the cache options
   * @param options Cache configuration options
   */
  configureCaching(options: Partial<CacheOptions>): void {
    this.cache.configure(options);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Number of items in cache
   */
  getCacheStats(): { size: number } {
    return {
      size: this.cache.size(),
    };
  }

  /**
   * Get all files for a project
   * @param params Parameters for getProjectFiles
   * @param forceRefresh If true, bypasses cache and makes a new API request
   * @returns Array of project files
   */
  async getProjectFiles(
    { projectName, searchTerm, searchType }: GetProjectFilesParams,
    forceRefresh = false
  ): Promise<ProjectFile[]> {
    // Generate cache key based on parameters
    const cacheKey = FileCacheKeys.filesList(
      projectName,
      searchTerm,
      searchType
    );

    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedFiles = this.cache.get<ProjectFile[]>(cacheKey);
      if (cachedFiles) {
        logger.debug(`Using cached files list for ${projectName}`);
        return cachedFiles;
      }
    }

    const queryParams: Record<string, string> = {};

    // Add search parameters if provided
    if (searchTerm) {
      queryParams.search = searchTerm;
      if (searchType) {
        queryParams.type = searchType;
      }
    }

    try {
      const files = await this.client.get<ProjectFile[]>(
        `/projects/${projectName}/files`,
        queryParams
      );

      // Store in cache
      this.cache.set(cacheKey, files);

      return files;
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
   * @param forceRefresh If true, bypasses cache and makes a new API request
   * @returns File content with requested fields
   */
  async getProjectFile(
    {
      projectName,
      filePath,
      fields = ['content', 'hash', 'lastModified'],
    }: GetProjectFileParams,
    forceRefresh = false
  ): Promise<ProjectFileContent> {
    // Generate cache key based on parameters
    const cacheKey = FileCacheKeys.fileDetail(projectName, filePath);

    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedFile = this.cache.get<ProjectFileContent>(cacheKey);
      if (cachedFile) {
        // Verify requested fields are in cached data
        const hasAllFields = fields.every((field) =>
          field === 'content'
            ? cachedFile.content !== undefined
            : field === 'hash'
            ? cachedFile.hash !== undefined
            : field === 'lastModified'
            ? cachedFile.lastModified !== undefined
            : false
        );

        if (hasAllFields) {
          logger.debug(`Using cached file: ${filePath}`);
          return cachedFile;
        }
      }
    }

    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

    try {
      const fileContent = await this.client.get<ProjectFileContent>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        { fields: fields.join(',') }
      );

      // Store in cache
      this.cache.set(cacheKey, fileContent);

      return fileContent;
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
   * @param forceRefresh If true, bypasses cache and makes a new API request
   * @returns FileImports object containing an array of import sources
   */
  async getFileImports(
    { filePath, projectName }: GetFileImportsParams,
    forceRefresh = false
  ): Promise<FileImports> {
    // Generate cache key based on parameters
    const cacheKey = FileCacheKeys.fileImports(projectName, filePath);

    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedImports = this.cache.get<FileImports>(cacheKey);
      if (cachedImports) {
        logger.debug(`Using cached imports for file: ${filePath}`);
        return cachedImports;
      }
    }

    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

    try {
      const imports = await this.client.get<string[]>(
        `/projects/${projectName}/files/${encodedFilePath}/imports`
      );

      // Convert the array of strings to a FileImports object
      const fileImports = { imports };

      // Store in cache
      this.cache.set(cacheKey, fileImports);

      return fileImports;
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
      const response = await this.client.post<WriteFileResponse>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        { content }
      );

      // Invalidate related cache entries
      this.invalidateFileCache(projectName, filePath);

      return response;
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
      const response = await this.client.put<WriteFileResponse>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        { oldText, newText }
      );

      // Invalidate related cache entries
      this.invalidateFileCache(projectName, filePath);

      return response;
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
      const response = await this.client.patch<WriteFileResponse>(
        `/projects/${projectName}/files/${encodedFilePath}`,
        payload
      );

      // Invalidate related cache entries
      this.invalidateFileCache(projectName, filePath);

      return response;
    } catch (error) {
      const apiError = new ApiError(
        `Failed to patch file ${filePath}`,
        isAxiosError(error) ? error : undefined
      );

      throw apiError;
    }
  }

  /**
   * Helper method to invalidate all cache entries related to a file
   * @param projectName The project name
   * @param filePath The file path
   */
  private invalidateFileCache(projectName: string, filePath: string): void {
    // Invalidate the specific file cache
    this.cache.invalidate(FileCacheKeys.fileDetail(projectName, filePath));

    // Invalidate the file's imports cache
    this.cache.invalidate(FileCacheKeys.fileImports(projectName, filePath));

    // Invalidate all file lists for this project (with various search parameters)
    // Since we can't know all possible search parameters that might have been used,
    // we'll invalidate the base key which should cover most cases
    this.cache.invalidate(FileCacheKeys.filesList(projectName));
  }
}
