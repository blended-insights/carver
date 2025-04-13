import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

interface GitDiffStagedProps {
  projectName: string;
}

/**
 * Tool function to show changes that are staged for commit
 * @param projectName Name of the project
 * @returns Diff output showing staged changes
 */
const gitDiffStagedTool: ToolFunction<GitDiffStagedProps> = async ({
  projectName,
}) => {
  try {
    const api = getApi();
    const diff = await api.git.gitDiffStaged({ projectName });

    // Check if there are staged changes
    const noChangesMessage = "No staged changes found";
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
      // Return a message when there are no staged changes
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
            `Failed to get staged diff for ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the git-diff-staged tool with the MCP server
 * @param server MCP server instance
 */
export function registerGitDiffStagedTool(server: McpServer) {
  server.tool(
    'carver-git-diff-staged',
    'Shows changes that are staged for commit',
    {
      projectName: z.string().describe('The name of the project'),
    },
    gitDiffStagedTool
  );
}
