import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

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
    const api = getApi();
    const result = await api.git.gitCheckout({ projectName, branchName });

    // Return the checkout result as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Successfully checked out branch '${branchName}'`,
              data: result
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // Use the shared error handler to format the error
    return {
      content: [
        {
          type: 'text',
          text: formatErrorResponse(
            error, 
            `Failed to checkout branch ${branchName} for ${projectName}`
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
    'carver-git-checkout',
    'Switches branches',
    {
      projectName: z.string().describe('The name of the project'),
      branchName: z.string().describe('Name of the branch to check out'),
    },
    gitCheckoutTool
  );
}
