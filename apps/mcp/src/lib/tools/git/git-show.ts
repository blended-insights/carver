import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitShowProps {
  projectName: string;
  revision: string;
}

/**
 * Tool function to show the contents of a commit
 * @param projectName Name of the project
 * @param revision Commit hash or reference
 * @returns Information about the specified commit
 */
const gitShowTool: ToolFunction<GitShowProps> = async ({
  projectName,
  revision,
}) => {
  try {
    const apiClient = getApiClient();
    const result = await apiClient.gitShow({ projectName, revision });

    // Return the show result as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: result,
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
              message: `Failed to show commit ${revision} for ${projectName}: ${
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
 * Register the git-show tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitShowTool(server: McpServer) {
  server.tool(
    'git_show',
    'Shows the contents of a commit',
    {
      projectName: z.string().describe('The name of the project'),
      revision: z.string().describe('Commit hash or reference'),
    },
    gitShowTool
  );
}
