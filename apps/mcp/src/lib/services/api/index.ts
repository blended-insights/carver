import { ApiError, CarverApiClient } from './client';
import { FileApiClient } from './file';
import { FolderApiClient } from './folder';
import { GitApiClient } from './git';
import { ProjectApiClient } from './project';
import { CommandsApiClient } from './commands';
import {
  ApiCache,
  CacheOptions,
  DEFAULT_CACHE_OPTIONS,
  FileCacheKeys,
  ProjectCacheKeys,
} from './cache';

// Re-export all types
export * from './types';

// Re-export the ApiError
export { ApiError };

// Re-export the cache
export {
  type ApiCache,
  type CacheOptions,
  DEFAULT_CACHE_OPTIONS,
  FileCacheKeys,
  ProjectCacheKeys,
};

/**
 * Complete API client with all functionality
 */
export class CarverApi {
  private readonly client: CarverApiClient;

  /**
   * Project-related API operations
   */
  readonly projects: ProjectApiClient;

  /**
   * File-related API operations
   */
  readonly files: FileApiClient;

  /**
   * Folder-related API operations
   */
  readonly folders: FolderApiClient;

  /**
   * Git-related API operations
   */
  readonly git: GitApiClient;

  /**
   * Commands-related API operations
   */
  readonly commands: CommandsApiClient;

  /**
   * Creates a new complete CarverApi instance
   * @param host Optional host override (defaults to localhost)
   * @param port Optional port override (defaults to 4000)
   * @param cacheOptions Optional cache configuration
   */
  constructor(
    host?: string,
    port?: number,
    cacheOptions?: Partial<CacheOptions>
  ) {
    this.client = new CarverApiClient(host, port);

    this.projects = new ProjectApiClient(this.client, cacheOptions);
    this.files = new FileApiClient(this.client, cacheOptions);
    this.folders = new FolderApiClient(this.client);
    this.git = new GitApiClient(this.client);
    this.commands = new CommandsApiClient(this.client);
  }

  /**
   * Get the underlying Axios client for direct access if needed
   */
  getClient(): CarverApiClient {
    return this.client;
  }

  /**
   * Configure caching for all API clients that support it
   * @param options Cache configuration options
   */
  configureCaching(options: Partial<CacheOptions>): void {
    // Configure caching for all services that support it
    this.projects.configureCaching(options);
    this.files.configureCaching(options);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    // Clear caches for all services that support caching
    this.projects.clearCache();
    this.files.clearCache();
  }

  /**
   * Get cache statistics for all API clients
   * @returns Object with cache sizes
   */
  getCacheStats(): { projects: number; files: number; total: number } {
    const projectsSize = this.projects.getCacheStats().size;
    const filesSize = this.files.getCacheStats().size;

    return {
      projects: projectsSize,
      files: filesSize,
      total: projectsSize + filesSize,
    };
  }
}

// Singleton instance
let apiInstance: CarverApi | null = null;

/**
 * Get the API singleton instance
 * @param host Optional host override
 * @param port Optional port override
 * @param cacheOptions Optional cache configuration
 * @returns CarverApi instance
 */
export function getApi(
  host?: string,
  port?: number,
  cacheOptions?: Partial<CacheOptions>
): CarverApi {
  if (!apiInstance) {
    apiInstance = new CarverApi(host, port, cacheOptions);
  } else if (cacheOptions) {
    // If we already have an instance but cacheOptions were provided, configure caching
    apiInstance.configureCaching(cacheOptions);
  }
  return apiInstance;
}

/**
 * Set the API singleton instance (useful for testing)
 * @param api CarverApi instance
 */
export function setApi(api: CarverApi): void {
  apiInstance = api;
}

/**
 * Initialize API client with configuration
 * @param host Optional host override
 * @param port Optional port override
 * @param cacheOptions Optional cache configuration
 */
export function initializeApi(
  host?: string,
  port?: number,
  cacheOptions?: Partial<CacheOptions>
): void {
  apiInstance = new CarverApi(host, port, cacheOptions);
}

// Export individual client classes for direct usage if needed
export { CarverApiClient } from './client';
export { FileApiClient } from './file';
export { FolderApiClient } from './folder';
export { GitApiClient } from './git';
export { ProjectApiClient } from './project';
export { CommandsApiClient } from './commands';
