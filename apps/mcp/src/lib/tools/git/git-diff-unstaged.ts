import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitDiffUnstagedProps {
  projectName: string;
}

/**
 * Tool function to show changes in the working directory that are not yet staged
 * @param projectName Name of the project
 * @returns Diff output showing unstaged changes
 */
const gitDiffUnstagedTool: ToolFunction<GitDiffUnstagedProps> = async ({
  projectName,
}) => {
  try {
    const apiClient = getApiClient();
    const diff = await apiClient.gitDiff({ projectName });

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
              message: `Failed to get unstaged diff for ${projectName}: ${
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
 * Register the git-diff-unstaged tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitDiffUnstagedTool(server: McpServer) {
  server.tool(
    'git_diff_unstaged',
    'Shows changes in the working directory that are not yet staged',
    {
      projectName: z.string().describe('The name of the project'),
    },
    gitDiffUnstagedTool
  );
}
