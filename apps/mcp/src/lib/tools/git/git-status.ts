import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

interface GitStatusProps {
  projectName: string;
}

/**
 * Tool function to get the git status of a project
 * @param projectName Name of the project
 * @returns Status object with git repository information
 */
const gitStatusTool: ToolFunction<GitStatusProps> = async ({
  projectName,
}) => {
  try {
    const api = getApi();
    const status = await api.git.getGitStatus({ projectName });

    // Return the status data as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Current branch: ${status.current}${
                status.tracking ? `, tracking: ${status.tracking}` : ''
              }`,
              data: status
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
            `Failed to get git status for ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the git-status tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitStatusTool(server: McpServer) {
  server.tool(
    'carver-git-status',
    'Shows the working tree status',
    {
      projectName: z.string().describe('The name of the project'),
    },
    gitStatusTool
  );
}
