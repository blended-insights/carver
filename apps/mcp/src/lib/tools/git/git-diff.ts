import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

interface GitDiffProps {
  projectName: string;
  target: string;
}

/**
 * Tool function to show differences between branches or commits
 * @param projectName Name of the project
 * @param target Branch name, commit hash, or revision specifier
 * @returns Diff output showing changes between revisions
 */
const gitDiffTool: ToolFunction<GitDiffProps> = async ({
  projectName,
  target,
}) => {
  try {
    const api = getApi();
    // For this implementation, we'll use gitShow as a simplification
    // In a more complete implementation, you might want to add a specific
    // gitDiffTarget method to the API client
    const diff = await api.git.gitShow({ projectName, revision: target });

    // Return the diff output as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: diff,
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
            `Failed to get diff for ${target} in ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the git-diff tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitDiffTool(server: McpServer) {
  server.tool(
    'carver-git-diff',
    'Shows differences between branches or commits',
    {
      projectName: z.string().describe('The name of the project'),
      target: z.string().describe('Branch name, commit hash, or revision specifier'),
    },
    gitDiffTool
  );
}
