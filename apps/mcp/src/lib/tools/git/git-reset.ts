import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project'),
};

type Schema = typeof schema;

/**
 * Tool function to unstage all staged changes
 * @param projectName Name of the project
 * @returns Result of the reset operation
 */
const gitResetTool: ToolCallback<Schema> = async ({
  projectName,
}) => {
  try {
    const api = getApi();
    const result = await api.git.gitReset({ projectName });

    // Return the reset result as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: "Successfully unstaged all changes",
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
            `Failed to reset staged changes for ${projectName}`
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
  server.tool<Schema>(
    'carver-git-reset',
    'Unstages all staged changes',
    schema,
    gitResetTool
  );
}
