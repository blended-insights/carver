import { isAxiosError } from 'axios';
import { CarverApiClient } from './client';
import { Project } from './types';

/**
 * ProjectApiClient - Handles project-related API operations
 */
export class ProjectApiClient {
  private client: CarverApiClient;

  /**
   * Creates a new ProjectApiClient
   * @param apiClient The CarverApiClient instance
   */
  constructor(apiClient: CarverApiClient) {
    this.client = apiClient;
  }

  /**
   * Get all available projects
   * @returns Array of project information
   */
  async getProjects(): Promise<Project[]> {
    try {
      return await this.client.get<Project[]>('/projects');
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
   * Get a specific project by name
   * @param projectName The name of the project
   * @returns Project information or null if not found
   */
  async getProject(projectName: string): Promise<Project | null> {
    try {
      return await this.client.get<Project>(`/projects/${projectName}`);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching project ${projectName}:`, error);
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

      return await this.client.post<Project>('/projects', payload);
    } catch (error) {
      console.error(`Error creating project ${projectName}:`, error);
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
      return true;
    } catch (error) {
      console.error(`Error deleting project ${projectName}:`, error);
      throw error;
    }
  }
}
