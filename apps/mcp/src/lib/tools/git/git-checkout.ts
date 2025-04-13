import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitCheckoutProps {
  projectName: string;
  branchName: string;
}

/**
 * Tool function to switch branches
 * @param projectName Name of the project
 * @param branchName Name of the branch to check out
 * @returns Result of the checkout operation
 */
const gitCheckoutTool: ToolFunction<GitCheckoutProps> = async ({
  projectName,
  branchName,
}) => {
  try {
    const apiClient = getApiClient();
    const result = await apiClient.gitCheckout({ projectName, branchName });

    // Return the checkout result as a formatted result
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
              message: `Failed to checkout branch ${branchName} for ${projectName}: ${
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
 * Register the git-checkout tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitCheckoutTool(server: McpServer) {
  server.tool(
    'git_checkout',
    'Switches branches',
    {
      projectName: z.string().describe('The name of the project'),
      branchName: z.string().describe('Name of the branch to check out'),
    },
    gitCheckoutTool
  );
}
