import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project'),
  revision: z.string().describe('Commit hash or reference'),
};

type Schema = typeof schema;

/**
 * Tool function to show the contents of a commit
 * @param projectName Name of the project
 * @param revision Commit hash or reference
 * @returns Information about the specified commit
 */
const gitShowTool: ToolCallback<Schema> = async ({
  projectName,
  revision,
}) => {
  try {
    const api = getApi();
    const result = await api.git.gitShow({ projectName, revision });

    // Check if there's any content in the result
    if (result && result.trim() !== '') {
      // Return the show result as a formatted result
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } else {
      // If the result is empty, return a more informative message
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `No content found for revision ${revision}`,
                data: { result: "" }
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
            `Failed to show commit ${revision} for ${projectName}`
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
  server.tool<Schema>(
    'carver-git-show',
    'Shows the contents of a commit',
    schema,
    gitShowTool
  );
}
