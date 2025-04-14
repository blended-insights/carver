import { isAxiosError } from 'axios';
import { ApiError, CarverApiClient } from './client';
import {
  ListCommandsParams,
  CommandsListResponse,
  ExecuteCommandParams,
  CommandExecutionResponse,
} from './types';

/**
 * CommandsApiClient - Handles all command-related API operations
 */
export class CommandsApiClient {
  private client: CarverApiClient;

  /**
   * Creates a new CommandsApiClient
   * @param apiClient The CarverApiClient instance
   */
  constructor(apiClient: CarverApiClient) {
    this.client = apiClient;
  }

  /**
   * List available commands for a project
   * @param params Parameters for listCommands
   * @returns CommandsListResponse with allowed commands and configuration
   */
  async listCommands({
    projectName,
  }: ListCommandsParams): Promise<CommandsListResponse> {
    try {
      return await this.client.get<CommandsListResponse>(
        `/projects/${projectName}/commands`
      );
    } catch (error) {
      // Transform the error to provide context about the operation
      const apiError = new ApiError(
        `Failed to list commands for project ${projectName}`,
        isAxiosError(error) ? error : undefined
      );

      throw apiError;
    }
  }

  /**
   * Execute a command in a project's root directory
   * @param params Parameters for executeCommand
   * @returns CommandExecutionResponse with stdout, stderr, and exit code
   */
  async executeCommand({
    projectName,
    command,
    args = [],
  }: ExecuteCommandParams): Promise<CommandExecutionResponse> {
    try {
      return await this.client.post<CommandExecutionResponse>(
        `/projects/${projectName}/commands`,
        { command, args }
      );
    } catch (error) {
      // Transform the error to provide context about the operation
      const apiError = new ApiError(
        `Failed to execute command '${command}' in project ${projectName}`,
        isAxiosError(error) ? error : undefined
      );

      throw apiError;
    }
  }
}
