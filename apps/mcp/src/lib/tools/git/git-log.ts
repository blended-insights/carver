import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project'),
  maxCount: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of commits to return'),
};

type Schema = typeof schema;

/**
 * Tool function to show commit logs
 * @param projectName Name of the project
 * @param maxCount Maximum number of commits to return (default: 10)
 * @returns Commit history information
 */
const gitLogTool: ToolCallback<Schema> = async ({
  projectName,
  maxCount = 10,
}) => {
  try {
    const api = getApi();
    const logs = await api.git.gitLog({ projectName, maxCount });

    // Return the log data as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Retrieved ${logs.total} commit logs (limited to ${maxCount})`,
              data: logs
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
            `Failed to get commit logs for ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the git-log tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitLogTool(server: McpServer) {
  server.tool<Schema>(
    'carver-git-log',
    'Shows the commit logs',
    schema,
    gitLogTool
  );
}
