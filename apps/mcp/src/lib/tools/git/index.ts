/**
 * Git-related tools for Carver MCP
 */

import type { McpServer } from '..';

import { registerGitAddTool } from './git-add';
import { registerGitCheckoutTool } from './git-checkout';
import { registerGitCommitTool } from './git-commit';
import { registerGitCreateBranchTool } from './git-create-branch';
import { registerGitDiffTool } from './git-diff';
import { registerGitDiffStagedTool } from './git-diff-staged';
import { registerGitDiffUnstagedTool } from './git-diff-unstaged';
import { registerGitLogTool } from './git-log';
import { registerGitResetTool } from './git-reset';
import { registerGitShowTool } from './git-show';
import { registerGitStatusTool } from './git-status';

/**
 * Register all Git-related tools with the MCP server
 * @param server MCP server instance
 */
export function registerGitTools(server: McpServer): void {
  registerGitStatusTool(server);
  registerGitAddTool(server);
  registerGitCommitTool(server);
  registerGitDiffTool(server);
  registerGitDiffStagedTool(server);
  registerGitDiffUnstagedTool(server);
  registerGitLogTool(server);
  registerGitCreateBranchTool(server);
  registerGitCheckoutTool(server);
  registerGitResetTool(server);
  registerGitShowTool(server);
}
