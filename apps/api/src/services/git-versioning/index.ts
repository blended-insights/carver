import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import logger from '../../utils/logger';
import { IGitVersionManager } from '../../interfaces/services.interface';

const execAsync = promisify(exec);

/**
 * Service to handle git-based version naming
 */
export class GitVersionManager implements IGitVersionManager {
  private rootPath: string;
  private gitDir: string;
  private currentCommit: string | null = null;
  private watchers: fs.FSWatcher[] = [];
  private gitHeadPath: string;
  private isWatching = false;

  // private gitStatusPath: string;
  private onVersionChange: (version: string) => void;

  /**
   * Constructor
   * @param rootPath Root path of the repository to watch
   * @param onVersionChange Callback function when version changes
   */
  constructor(rootPath: string, onVersionChange: (version: string) => void) {
    this.rootPath = path.resolve(rootPath);
    this.gitDir = path.join(this.rootPath, '.git');
    this.gitHeadPath = path.join(this.gitDir, 'HEAD');
    // this.gitStatusPath = path.join(this.gitDir, 'index');
    this.onVersionChange = onVersionChange;
  }

  /**
   * Check if given directory is a git repository
   * @returns boolean indicating if this is a git repository
   */
  private async isGitRepository(): Promise<boolean> {
    try {
      return (
        fs.existsSync(this.gitDir) && fs.statSync(this.gitDir).isDirectory()
      );
    } catch (error) {
      logger.error('Error checking if directory is a git repository:', error);
      return false;
    }
  }

  /**
   * Get the current git commit hash
   * @returns Short commit hash
   */
  private async getCurrentCommit(forceRefresh = false): Promise<string> {
    try {
      // Return cached commit hash if available and not forcing refresh
      if (!forceRefresh && this.currentCommit) {
        return this.currentCommit;
      }

      const { stdout } = await execAsync('git rev-parse --short HEAD', {
        cwd: this.rootPath,
      });
      this.currentCommit = stdout.trim();
      return this.currentCommit;
    } catch (error) {
      logger.error('Error getting current git commit:', error);
      throw error;
    }
  }

  /**
   * Check if there are modified files in the working directory
   * @returns boolean indicating if there are unstaged or staged changes
   */
  private async hasModifiedFiles(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.rootPath,
      });
      return stdout.trim().length > 0;
    } catch (error) {
      logger.error('Error checking for modified files:', error);
      return false;
    }
  }

  /**
   * Generate version string based on git status
   * @returns Version string in the format 'commit_hash' or 'commit_hash-modified'
   */
  private async generateVersionString(): Promise<string> {
    try {
      // Get the commit hash, leveraging the cache if available
      const commit = await this.getCurrentCommit();
      const isModified = await this.hasModifiedFiles();

      // Return the formatted version string
      return isModified ? `${commit}-modified` : commit;
    } catch (error) {
      logger.error('Error generating version string:', error);
      // Fallback to timestamp-based version if git operations fail
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      return `v_${timestamp}_${randomSuffix}`;
    }
  }

  /**
   * Handle git changes by generating new version string
   */
  private async handleGitChange(type: string): Promise<void> {
    try {
      // Reset currentCommit to null to force refresh on next call
      this.currentCommit = null;
      const version = await this.generateVersionString();
      logger.info(
        `Git change detected (${type ?? 'unknown'}), new version: ${version}`
      );
      this.onVersionChange(version);
    } catch (error) {
      logger.error('Error handling git change:', error);
    }
  }

  /**
   * Start watching git repository for changes
   */
  public async startWatching(): Promise<boolean> {
    try {
      if (this.isWatching) {
        logger.warn('Git version manager is already watching');
        return true;
      }

      const isGitRepo = await this.isGitRepository();
      if (!isGitRepo) {
        logger.warn(`Directory ${this.rootPath} is not a git repository`);
        return false;
      }

      // Set initial version
      const initialVersion = await this.generateVersionString();
      this.onVersionChange(initialVersion);

      // Watch .git/HEAD file for branch/checkout changes
      const headWatcher = fs.watch(
        this.gitHeadPath,
        this.handleGitChange.bind(this, 'HEAD')
      );
      this.watchers.push(headWatcher);

      // Watch .git/index file for staging/unstaging changes
      // const indexWatcher = fs.watch(
      //   this.gitStatusPath,
      //   this.handleGitChange.bind(this, 'index')
      // );
      // this.watchers.push(indexWatcher);

      // Also watch specific git command files if they exist
      const gitMergeHeadPath = path.join(this.gitDir, 'MERGE_HEAD');
      const gitRebaseApplyPath = path.join(this.gitDir, 'rebase-apply');
      const gitRebaseMergePath = path.join(this.gitDir, 'rebase-merge');

      if (fs.existsSync(gitMergeHeadPath)) {
        const mergeWatcher = fs.watch(
          gitMergeHeadPath,
          this.handleGitChange.bind(this, 'MERGE_HEAD')
        );
        this.watchers.push(mergeWatcher);
      }

      if (fs.existsSync(gitRebaseApplyPath)) {
        const rebaseApplyWatcher = fs.watch(
          gitRebaseApplyPath,
          this.handleGitChange.bind(this, 'rebase-apply')
        );
        this.watchers.push(rebaseApplyWatcher);
      }

      if (fs.existsSync(gitRebaseMergePath)) {
        const rebaseMergeWatcher = fs.watch(
          gitRebaseMergePath,
          this.handleGitChange.bind(this, 'rebase-merge')
        );
        this.watchers.push(rebaseMergeWatcher);
      }

      this.isWatching = true;
      logger.info(`Started git version watching for ${this.rootPath}`);
      return true;
    } catch (error) {
      logger.error('Error starting git version watching:', error);
      return false;
    }
  }

  /**
   * Stop watching git repository
   */
  public stopWatching(): void {
    if (!this.isWatching) {
      return;
    }

    for (const watcher of this.watchers) {
      watcher.close();
    }

    this.watchers = [];
    this.isWatching = false;
    logger.info(`Stopped git version watching for ${this.rootPath}`);
  }

  /**
   * Get the current version string
   * @returns Promise with the current version string
   */
  public async getCurrentVersion(): Promise<string> {
    return this.generateVersionString();
  }
}

export default GitVersionManager;
