import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project'),
  branchName: z.string().describe('Name of the branch to check out'),
};

type Schema = typeof schema;

/**
 * Tool function to switch branches
 * @param projectName Name of the project
 * @param branchName Name of the branch to check out
 * @returns Result of the checkout operation
 */
const gitCheckoutTool: ToolCallback<Schema> = async ({
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
  server.tool<Schema>(
    'carver-git-checkout',
    'Switches branches',
    schema,
    gitCheckoutTool
  );
}
