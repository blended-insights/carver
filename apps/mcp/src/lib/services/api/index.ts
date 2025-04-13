import { ApiError, CarverApiClient } from './client';
import { FileApiClient } from './file';
import { FolderApiClient } from './folder';
import { GitApiClient } from './git';
import { ProjectApiClient } from './project';

// Re-export all types
export * from './types';

// Re-export the ApiError
export { ApiError };

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
   * Creates a new complete CarverApi instance
   * @param host Optional host override (defaults to localhost)
   * @param port Optional port override (defaults to 4000)
   */
  constructor(host?: string, port?: number) {
    this.client = new CarverApiClient(host, port);
    
    this.projects = new ProjectApiClient(this.client);
    this.files = new FileApiClient(this.client);
    this.folders = new FolderApiClient(this.client);
    this.git = new GitApiClient(this.client);
  }

  /**
   * Get the underlying Axios client for direct access if needed
   */
  getClient(): CarverApiClient {
    return this.client;
  }
}

// Singleton instance
let apiInstance: CarverApi | null = null;

/**
 * Get the API singleton instance
 * @param host Optional host override
 * @param port Optional port override
 * @returns CarverApi instance
 */
export function getApi(host?: string, port?: number): CarverApi {
  if (!apiInstance) {
    apiInstance = new CarverApi(host, port);
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
 */
export function initializeApi(host?: string, port?: number): void {
  apiInstance = new CarverApi(host, port);
}

// Export individual client classes for direct usage if needed
export { CarverApiClient } from './client';
export { FileApiClient } from './file';
export { FolderApiClient } from './folder';
export { GitApiClient } from './git';
export { ProjectApiClient } from './project';
