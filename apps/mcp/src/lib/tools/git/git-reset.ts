import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitResetProps {
  projectName: string;
}

/**
 * Tool function to unstage all staged changes
 * @param projectName Name of the project
 * @returns Result of the reset operation
 */
const gitResetTool: ToolFunction<GitResetProps> = async ({
  projectName,
}) => {
  try {
    const apiClient = getApiClient();
    const result = await apiClient.gitReset({ projectName });

    // Return the reset result as a formatted result
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
              message: `Failed to reset staged changes for ${projectName}: ${
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
 * Register the git-reset tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitResetTool(server: McpServer) {
  server.tool(
    'git_reset',
    'Unstages all staged changes',
    {
      projectName: z.string().describe('The name of the project'),
    },
    gitResetTool
  );
}
