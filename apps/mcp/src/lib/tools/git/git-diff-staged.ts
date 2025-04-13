import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitDiffStagedProps {
  projectName: string;
}

/**
 * Tool function to show changes that are staged for commit
 * @param projectName Name of the project
 * @returns Diff output showing staged changes
 */
const gitDiffStagedTool: ToolFunction<GitDiffStagedProps> = async ({
  projectName,
}) => {
  try {
    const apiClient = getApiClient();
    const diff = await apiClient.gitDiffStaged({ projectName });

    // Return the diff output as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: diff,
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
              message: `Failed to get staged diff for ${projectName}: ${
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
 * Register the git-diff-staged tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitDiffStagedTool(server: McpServer) {
  server.tool(
    'git_diff_staged',
    'Shows changes that are staged for commit',
    {
      projectName: z.string().describe('The name of the project'),
    },
    gitDiffStagedTool
  );
}
