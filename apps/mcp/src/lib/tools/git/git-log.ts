import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

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
  server.tool(
    'carver-git-log',
    'Shows the commit logs',
    {
      projectName: z.string().describe('The name of the project'),
      maxCount: z.number().optional().default(10).describe('Maximum number of commits to return'),
    },
    gitLogTool
  );
}
