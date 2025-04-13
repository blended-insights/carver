import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

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
    const apiClient = getApiClient();
    const result = await apiClient.gitCommit({ projectName, message });

    // Return the commit result as a formatted result
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
              message: `Failed to commit changes for ${projectName}: ${
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
 * Register the git-commit tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitCommitTool(server: McpServer) {
  server.tool(
    'git_commit',
    'Records changes to the repository',
    {
      projectName: z.string().describe('The name of the project'),
      message: z.string().describe('Commit message'),
    },
    gitCommitTool
  );
}
