/**
 * Type definition for API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * File imports structure
 */
export interface FileImports {
  imports: string[];
}

/**
 * Folder tree item structure
 */
export interface FolderTreeItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FolderTreeItem[];
}

/**
 * Git status response
 */
export interface GitStatus {
  current: string;
  tracking?: string;
  files: Array<{
    path: string;
    working_dir?: string;
    index?: string;
  }>;
  not_added: string[];
  conflicted: string[];
  created: string[];
  deleted: string[];
  modified: string[];
  renamed: string[];
  staged: string[];
  ahead: number;
  behind: number;
  // Other properties from simple-git
}

/**
 * Git commit response
 */
export interface GitCommit {
  commit: string;
  message: string;
  author_name: string;
  author_email: string;
  date: string;
  // Other properties from simple-git
}

/**
 * Git log response
 */
export interface GitLog {
  latest: GitCommit;
  all: GitCommit[];
  total: number;
}

/**
 * Project data structure
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  fileCount: number;
  lastUpdated: string;
}

/**
 * Project file data types
 */
export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
}

/**
 * Project folder data types
 */
export interface ProjectFolder {
  path: string;
  name: string;
}

/**
 * Project file content response - fields configurable based on request
 */
export interface ProjectFileContent {
  content?: string;
  hash?: string;
  lastModified?: string;
}

/**
 * Write file response data structure
 */
export interface WriteFileResponse {
  jobId: string;
  path: string;
}

/**
 * Commands list response data structure
 */
export interface CommandsListResponse {
  allowedCommands: string[];
  config: {
    source: string;
    rawValue: string;
  };
}

/**
 * Command execution response data structure
 */
export interface CommandExecutionResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Base parameters for API requests
 */
export interface BaseParams {
  projectName: string;
}

/**
 * Parameters for getProjectFiles
 */
export interface GetProjectFilesParams extends BaseParams {
  searchTerm?: string;
  searchType?: 'function' | 'import' | 'directory';
}

/**
 * Parameters for getProjectFile
 */
export interface GetProjectFileParams extends BaseParams {
  filePath: string;
  fields?: Array<'content' | 'hash' | 'lastModified'>;
}

/**
 * Parameters for getFileImports
 */
export interface GetFileImportsParams extends BaseParams {
  filePath: string;
}

/**
 * Parameters for writeProjectFile
 */
export interface WriteProjectFileParams extends BaseParams {
  filePath: string;
  content: string;
}

/**
 * Parameters for updateProjectFile
 */
export interface UpdateProjectFileParams extends BaseParams {
  filePath: string;
  oldText: string;
  newText: string;
}

/**
 * Parameters for getProjectFolders
 */
export interface GetProjectFoldersParams extends BaseParams {
  searchTerm?: string;
}

/**
 * Parameters for getProjectFolder
 */
export interface GetProjectFolderParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for getFilesInFolder
 */
export interface GetFilesInFolderParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for getFolderItems
 */
export interface GetFolderItemsParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for getFolderTree
 */
export interface GetFolderTreeParams extends BaseParams {
  folderPath: string;
  depth?: number;
}

/**
 * Parameters for createProjectFolder
 */
export interface CreateProjectFolderParams extends BaseParams {
  folderPath: string;
}

/**
 * Parameters for patchProjectFile
 */
export interface PatchProjectFileParams extends BaseParams {
  filePath: string;
  startLine: number;
  endLine?: number;
  newContent?: string;
  operation?: 'replace' | 'insert' | 'delete';
}

/**
 * Parameters for listCommands
 */
export type ListCommandsParams = BaseParams;

/**
 * Parameters for executeCommand
 */
export interface ExecuteCommandParams extends BaseParams {
  command: string;
  args?: string[];
}

/**
 * Parameters for getGitStatus
 */
export type GetGitStatusParams = BaseParams;

/**
 * Parameters for gitAddFiles
 */
export interface GitAddFilesParams extends BaseParams {
  files: string[];
}

/**
 * Parameters for gitCommit
 */
export interface GitCommitParams extends BaseParams {
  message: string;
}

/**
 * Parameters for gitDiff
 */
export type GitDiffParams = BaseParams;

/**
 * Parameters for gitDiffStaged
 */
export type GitDiffStagedParams = BaseParams;

/**
 * Parameters for gitLog
 */
export interface GitLogParams extends BaseParams {
  maxCount?: number;
}

/**
 * Parameters for gitCreateBranch
 */
export interface GitCreateBranchParams extends BaseParams {
  branchName: string;
  baseBranch?: string;
}

/**
 * Parameters for gitCheckout
 */
export interface GitCheckoutParams extends BaseParams {
  branchName: string;
}

/**
 * Parameters for gitReset
 */
export type GitResetParams = BaseParams;

/**
 * Parameters for gitShow
 */
export interface GitShowParams extends BaseParams {
  revision: string;
}
