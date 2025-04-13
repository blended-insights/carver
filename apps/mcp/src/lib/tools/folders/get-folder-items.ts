import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  folderPath: z.string().describe('The path of the folder to retrieve items from.'),
};

type Schema = typeof schema;

/**
 * Tool function to get items (files and folders) in a specific project folder
 * @param projectName Name of the project
 * @param folderPath Path of the folder to retrieve items from
 * @returns List of items in the folder
 */
const getFolderItemsTool: ToolCallback<Schema> = async ({
  projectName,
  folderPath,
}) => {
  try {
    const api = getApi();
    const folderItems = await api.folders.getFolderItems({
      projectName,
      folderPath,
    });

    // Return the folder items as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Retrieved ${folderItems.length} items from folder ${folderPath}`,
              data: folderItems
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
            `Failed to retrieve folder items for ${folderPath}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the get-folder-items tool with the MCP server
 * @param server MCP server instance
 */
export function registerGetFolderItemsTool(server: McpServer) {
  server.tool<Schema>(
    'carver-get-folder-items',
    'Get items (files and folders) in a specific project folder.',
    schema,
    getFolderItemsTool
  );
}
