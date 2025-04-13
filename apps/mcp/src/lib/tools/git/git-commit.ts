import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

interface GitCommitProps {
  projectName: string;
  message: string;
}

/**
 * Tool function to commit changes to the repository
 * @param projectName Name of the project
 * @param message Commit message
 * @returns Result of the commit operation
 */
const gitCommitTool: ToolFunction<GitCommitProps> = async ({
  projectName,
  message,
}) => {
  try {
    const api = getApi();
    const result = await api.git.gitCommit({ projectName, message });

    // Return the commit result as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Successfully committed changes to repository with message: "${message}"`,
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
            `Failed to commit changes for ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the git-commit tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitCommitTool(server: McpServer) {
  server.tool(
    'carver-git-commit',
    'Records changes to the repository',
    {
      projectName: z.string().describe('The name of the project'),
      message: z.string().describe('Commit message'),
    },
    gitCommitTool
  );
}
