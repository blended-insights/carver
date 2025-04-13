import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import logger from '@/utils/logger';

/**
 * Service to handle git operations
 */
export class GitService {
  /**
   * Get a configured SimpleGit instance for a project
   * @param projectPath Path to the git repository
   * @returns SimpleGit instance
   */
  private getGitInstance(projectPath: string): SimpleGit {
    const options: Partial<SimpleGitOptions> = {
      baseDir: projectPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      config: [],
    };

    return simpleGit(options);
  }

  /**
   * Get the status of the git repository
   * @param projectPath Path to the git repository
   * @returns Git status information
   */
  async status(projectPath: string) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.status();
    } catch (error) {
      logger.error(`Error getting git status for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Perform git add operation
   * @param projectPath Path to the git repository
   * @param files Files to add (glob patterns supported)
   * @returns Result of the add operation
   */
  async add(projectPath: string, files: string[]) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.add(files);
    } catch (error) {
      logger.error(`Error performing git add for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Show differences between working directory and index
   * @param projectPath Path to the git repository
   * @returns Diff information
   */
  async diff(projectPath: string) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.diff();
    } catch (error) {
      logger.error(`Error getting git diff for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Show differences between staged changes and HEAD
   * @param projectPath Path to the git repository
   * @returns Diff information
   */
  async diffStaged(projectPath: string) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.diff(['--staged']);
    } catch (error) {
      logger.error(`Error getting git staged diff for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Commit changes to the repository
   * @param projectPath Path to the git repository
   * @param message Commit message
   * @returns Result of the commit operation
   */
  async commit(projectPath: string, message: string) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.commit(message);
    } catch (error) {
      logger.error(`Error committing changes for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Show commit logs
   * @param projectPath Path to the git repository
   * @param options Options for the log operation
   * @returns Commit log information
   */
  async log(projectPath: string, options: { maxCount?: number } = {}) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.log({
        maxCount: options.maxCount || 10,
      });
    } catch (error) {
      logger.error(`Error getting git logs for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Create a new branch
   * @param projectPath Path to the git repository
   * @param branchName Name of the new branch
   * @param baseBranch Optional base branch to create from
   * @returns Result of the branch creation
   */
  async createBranch(
    projectPath: string,
    branchName: string,
    baseBranch?: string
  ) {
    try {
      const git = this.getGitInstance(projectPath);
      if (baseBranch) {
        return await git.checkoutBranch(branchName, baseBranch);
      } else {
        return await git.checkoutLocalBranch(branchName);
      }
    } catch (error) {
      logger.error(
        `Error creating branch ${branchName} for ${projectPath}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Switch to a branch
   * @param projectPath Path to the git repository
   * @param branchName Name of the branch to checkout
   * @returns Result of the checkout operation
   */
  async checkout(projectPath: string, branchName: string) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.checkout(branchName);
    } catch (error) {
      logger.error(
        `Error checking out branch ${branchName} for ${projectPath}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Reset all staged changes
   * @param projectPath Path to the git repository
   * @returns Result of the reset operation
   */
  async reset(projectPath: string) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.reset(['HEAD']);
    } catch (error) {
      logger.error(`Error resetting staged changes for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Show specific commit information
   * @param projectPath Path to the git repository
   * @param revision Commit hash or reference
   * @returns Commit information
   */
  async show(projectPath: string, revision: string) {
    try {
      const git = this.getGitInstance(projectPath);
      return await git.show([revision]);
    } catch (error) {
      logger.error(
        `Error showing commit ${revision} for ${projectPath}:`,
        error
      );
      throw error;
    }
  }
}

// Export a singleton instance
export const gitService = new GitService();
export default gitService;
