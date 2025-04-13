import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitLogProps {
  projectName: string;
  maxCount?: number;
}

/**
 * Tool function to show commit logs
 * @param projectName Name of the project
 * @param maxCount Maximum number of commits to return (default: 10)
 * @returns Commit history information
 */
const gitLogTool: ToolFunction<GitLogProps> = async ({
  projectName,
  maxCount = 10,
}) => {
  try {
    const apiClient = getApiClient();
    const logs = await apiClient.gitLog({ projectName, maxCount });

    // Return the log data as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(logs, null, 2),
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
              message: `Failed to get commit logs for ${projectName}: ${
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
 * Register the git-log tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitLogTool(server: McpServer) {
  server.tool(
    'git_log',
    'Shows the commit logs',
    {
      projectName: z.string().describe('The name of the project'),
      maxCount: z.number().optional().default(10).describe('Maximum number of commits to return'),
    },
    gitLogTool
  );
}
