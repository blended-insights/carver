import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project'),
  files: z.array(z.string()).describe('Array of file paths or patterns to add'),
};

type Schema = typeof schema;

/**
 * Tool function to add file contents to the staging area
 * @param projectName Name of the project
 * @param files Array of file paths or patterns to add
 * @returns Result of the add operation
 */
const gitAddTool: ToolCallback<Schema> = async ({
  projectName,
  files,
}) => {
  try {
    const api = getApi();
    const result = await api.git.gitAddFiles({ projectName, files });

    // Return the add result as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Successfully added ${files.length} file(s) to git staging area`,
              data: result,
              files: files
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
            `Failed to add files to staging for ${projectName}`
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
  server.tool<Schema>(
    'carver-git-add',
    'Adds file contents to the staging area',
    schema,
    gitAddTool
  );
}
