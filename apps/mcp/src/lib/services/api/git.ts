import { CarverApiClient } from './client';
import {
  GetGitStatusParams,
  GitStatus,
  GitAddFilesParams,
  GitCommitParams,
  GitDiffParams,
  GitDiffStagedParams,
  GitLogParams,
  GitLog,
  GitCreateBranchParams,
  GitCheckoutParams,
  GitResetParams,
  GitShowParams
} from './types';

/**
 * GitApiClient - Handles all git-related API operations
 */
export class GitApiClient {
  private client: CarverApiClient;

  /**
   * Creates a new GitApiClient
   * @param apiClient The CarverApiClient instance
   */
  constructor(apiClient: CarverApiClient) {
    this.client = apiClient;
  }

  /**
   * Get the git status of a project
   * @param params Parameters for getGitStatus
   * @returns Git status information
   */
  async getGitStatus({ projectName }: GetGitStatusParams): Promise<GitStatus> {
    try {
      return await this.client.get<GitStatus>(
        `/projects/${projectName}/git/status`
      );
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
      return await this.client.post<unknown>(
        `/projects/${projectName}/git/add`,
        { files }
      );
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
      return await this.client.post<unknown>(
        `/projects/${projectName}/git/commits`,
        { message }
      );
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
      return await this.client.get<string>(
        `/projects/${projectName}/git/diff`
      );
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
      return await this.client.get<string>(
        `/projects/${projectName}/git/diff/staged`
      );
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
      return await this.client.get<GitLog>(
        `/projects/${projectName}/git/logs`,
        { maxCount }
      );
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

      return await this.client.post<unknown>(
        `/projects/${projectName}/git/branches`,
        payload
      );
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
      return await this.client.post<unknown>(
        `/projects/${projectName}/git/branches/${branchName}`,
        {}
      );
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
      return await this.client.post<unknown>(
        `/projects/${projectName}/git/reset`,
        {}
      );
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
      return await this.client.get<string>(
        `/projects/${projectName}/git/commits/${revision}`
      );
    } catch (error) {
      console.error(`Error showing git commit for ${projectName}:`, error);
      throw error;
    }
  }
}
