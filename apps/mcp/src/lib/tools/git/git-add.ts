import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface GitAddProps {
  projectName: string;
  files: string[];
}

/**
 * Tool function to add file contents to the staging area
 * @param projectName Name of the project
 * @param files Array of file paths or patterns to add
 * @returns Result of the add operation
 */
const gitAddTool: ToolFunction<GitAddProps> = async ({
  projectName,
  files,
}) => {
  try {
    const apiClient = getApiClient();
    const result = await apiClient.gitAddFiles({ projectName, files });

    // Return the add result as a formatted result
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
              message: `Failed to add files to staging for ${projectName}: ${
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
 * Register the git-add tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitAddTool(server: McpServer) {
  server.tool(
    'git_add',
    'Adds file contents to the staging area',
    {
      projectName: z.string().describe('The name of the project'),
      files: z.array(z.string()).describe('Array of file paths or patterns to add'),
    },
    gitAddTool
  );
}
