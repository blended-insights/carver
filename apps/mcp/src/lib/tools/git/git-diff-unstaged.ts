import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

interface GitDiffUnstagedProps {
  projectName: string;
}

/**
 * Tool function to show changes in the working directory that are not yet staged
 * @param projectName Name of the project
 * @returns Diff output showing unstaged changes
 */
const gitDiffUnstagedTool: ToolFunction<GitDiffUnstagedProps> = async ({
  projectName,
}) => {
  try {
    const api = getApi();
    const diff = await api.git.gitDiff({ projectName });

    // Check if there are unstaged changes
    const noChangesMessage = "No unstaged changes found";
    const hasChanges = diff && diff.trim() !== '';

    // Return the diff output as a formatted result
    if (hasChanges) {
      return {
        content: [
          {
            type: 'text',
            text: diff,
          },
        ],
      };
    } else {
      // Return a message when there are no unstaged changes
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: noChangesMessage,
                data: { diff: "" }
              },
              null,
              2
            ),
          },
        ],
      };
    }
  } catch (error) {
    // Use the shared error handler to format the error
    return {
      content: [
        {
          type: 'text',
          text: formatErrorResponse(
            error, 
            `Failed to get unstaged diff for ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the git-diff-unstaged tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitDiffUnstagedTool(server: McpServer) {
  server.tool(
    'carver-git-diff-unstaged',
    'Shows changes in the working directory that are not yet staged',
    {
      projectName: z.string().describe('The name of the project'),
    },
    gitDiffUnstagedTool
  );
}
