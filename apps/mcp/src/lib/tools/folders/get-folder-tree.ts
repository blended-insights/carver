import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  folderPath: z.string().describe('The path of the folder to retrieve tree for.'),
  depth: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional maximum depth of recursion. Defaults to full recursion.'),
};

type Schema = typeof schema;

/**
 * Tool function to get a recursive tree view of a project folder
 * @param projectName Name of the project
 * @param folderPath Path of the folder to retrieve tree for
 * @param depth Optional depth of recursion (defaults to full recursion)
 * @returns Recursive tree structure of folder contents
 */
const getFolderTreeTool: ToolCallback<Schema> = async ({
  projectName,
  folderPath,
  depth,
}) => {
  try {
    const api = getApi();
    const folderTree = await api.folders.getFolderTree({
      projectName,
      folderPath,
      depth,
    });

    // Return the folder tree as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(folderTree, null, 2),
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
            `Failed to retrieve folder tree for ${folderPath}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the get-folder-tree tool with the MCP server
 * @param server MCP server instance
 */
export function registerGetFolderTreeTool(server: McpServer) {
  server.tool<Schema>(
    'carver-get-folder-tree',
    "Get a recursive tree view of a project folder's contents.",
    schema,
    getFolderTreeTool
  );
}
