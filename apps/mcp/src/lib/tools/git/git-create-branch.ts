import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitCreateBranchProps {
  projectName: string;
  branchName: string;
  baseBranch?: string | null;
}

/**
 * Tool function to create a new branch
 * @param projectName Name of the project
 * @param branchName Name of the new branch
 * @param baseBranch Optional base branch to create from (default: current branch)
 * @returns Result of the branch creation
 */
const gitCreateBranchTool: ToolFunction<GitCreateBranchProps> = async ({
  projectName,
  branchName,
  baseBranch,
}) => {
  try {
    const apiClient = getApiClient();
    const result = await apiClient.gitCreateBranch({
      projectName,
      branchName,
      baseBranch: baseBranch || undefined,
    });

    // Return the branch creation result as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Return the error as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              message: `Failed to create branch ${branchName} for ${projectName}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
            null,
            2
          ),
        },
      ],
    };
  }
};

/**
 * Register the git-create-branch tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitCreateBranchTool(server: McpServer) {
  server.tool(
    'git_create_branch',
    'Creates a new branch from an optional base branch',
    {
      projectName: z.string().describe('The name of the project'),
      branchName: z.string().describe('Name for the new branch'),
      baseBranch: z.string().nullable().optional().describe('Optional source branch to create from (defaults to the repository\'s default branch)'),
    },
    gitCreateBranchTool
  );
}
