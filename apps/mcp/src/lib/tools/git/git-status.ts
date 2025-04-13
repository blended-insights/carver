import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

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
    const apiClient = getApiClient();
    const status = await apiClient.getGitStatus({ projectName });

    // Return the status data as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2),
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
              message: `Failed to get git status for ${projectName}: ${
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
 * Register the git-status tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitStatusTool(server: McpServer) {
  server.tool(
    'git_status',
    'Shows the working tree status',
    {
      projectName: z.string().describe('The name of the project'),
    },
    gitStatusTool
  );
}
