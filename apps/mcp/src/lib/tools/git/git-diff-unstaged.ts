import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project'),
};

type Schema = typeof schema;

/**
 * Tool function to show changes in the working directory that are not yet staged
 * @param projectName Name of the project
 * @returns Diff output showing unstaged changes
 */
const gitDiffUnstagedTool: ToolCallback<Schema> = async ({
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
  server.tool<Schema>(
    'carver-git-diff-unstaged',
    'Shows changes in the working directory that are not yet staged',
    schema,
    gitDiffUnstagedTool
  );
}
