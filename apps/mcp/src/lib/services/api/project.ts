import { isAxiosError } from 'axios';
import { CarverApiClient } from './client';
import { Project } from './types';
import { ApiCache, CacheOptions, ProjectCacheKeys } from './cache';
import { logger } from '@/lib/logger';

/**
 * ProjectApiClient - Handles project-related API operations
 */
export class ProjectApiClient {
  private client: CarverApiClient;
  private cache: ApiCache;

  /**
   * Creates a new ProjectApiClient
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
   * Get all available projects
   * @param forceRefresh If true, bypasses cache and makes a new API request
   * @returns Array of project information
   */
  async getProjects(forceRefresh = false): Promise<Project[]> {
    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedProjects = this.cache.get<Project[]>(
        ProjectCacheKeys.PROJECTS_LIST
      );
      if (cachedProjects) {
        logger.debug('Using cached projects list');
        return cachedProjects;
      }
    }

    try {
      const projects = await this.client.get<Project[]>('/projects');

      // Store in cache
      this.cache.set(ProjectCacheKeys.PROJECTS_LIST, projects);

      return projects;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Return empty array for not found, which is a common case
        return [];
      }
      logger.error('Error fetching projects:', { error });
      throw error;
    }
  }

  /**
   * Get a specific project by name
   * @param projectName The name of the project
   * @param forceRefresh If true, bypasses cache and makes a new API request
   * @returns Project information or null if not found
   */
  async getProject(
    projectName: string,
    forceRefresh = false
  ): Promise<Project | null> {
    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedProject = this.cache.get<Project>(
        ProjectCacheKeys.projectDetail(projectName)
      );
      if (cachedProject) {
        logger.debug(`Using cached project: ${projectName}`);
        return cachedProject;
      }
    }

    try {
      const project = await this.client.get<Project>(
        `/projects/${projectName}`
      );

      // Store in cache
      this.cache.set(ProjectCacheKeys.projectDetail(projectName), project);

      return project;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      logger.error(`Error fetching project ${projectName}:`, { error });
      throw error;
    }
  }

  /**
   * Create a new project
   * @param projectName The name of the project
   * @param projectPath Optional path for the project
   * @returns Created project information
   */
  async createProject(
    projectName: string,
    projectPath?: string
  ): Promise<Project> {
    try {
      const payload: { name: string; path?: string } = {
        name: projectName,
      };

      if (projectPath) {
        payload.path = projectPath;
      }

      const newProject = await this.client.post<Project>('/projects', payload);

      // Invalidate projects list cache on creation
      this.cache.invalidate(ProjectCacheKeys.PROJECTS_LIST);

      return newProject;
    } catch (error) {
      logger.error(`Error creating project ${projectName}:`, { error });
      throw error;
    }
  }

  /**
   * Delete a project
   * @param projectName The name of the project
   * @returns Success status
   */
  async deleteProject(projectName: string): Promise<boolean> {
    try {
      await this.client.delete<void>(`/projects/${projectName}`);

      // Invalidate caches on delete
      this.cache.invalidate(ProjectCacheKeys.PROJECTS_LIST);
      this.cache.invalidate(ProjectCacheKeys.projectDetail(projectName));

      return true;
    } catch (error) {
      logger.error(`Error deleting project ${projectName}:`, { error });
      throw error;
    }
  }
}
