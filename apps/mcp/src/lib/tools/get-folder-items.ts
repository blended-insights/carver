import z from 'zod';
import type { McpServer, ToolFunction } from '.';
import { getApiClient } from '@/lib/services';

interface GetFolderItemsProps {
  projectName: string;
  folderPath: string;
}

/**
 * Tool function to get items (files and folders) in a specific project folder
 * @param projectName Name of the project
 * @param folderPath Path of the folder to retrieve items from
 * @returns List of items in the folder
 */
const getFolderItemsTool: ToolFunction<GetFolderItemsProps> = async ({
  projectName,
  folderPath,
}) => {
  try {
    const apiClient = getApiClient();
    const folderItems = await apiClient.getFolderItems({
      projectName,
      folderPath,
    });

    // Return the folder items as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(folderItems, null, 2),
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
              message: `Failed to retrieve folder items for ${folderPath}: ${
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
 * Register the get-folder-items tool with the MCP server
 * @param server MCP server instance
 */
export function registerGetFolderItemsTool(server: McpServer) {
  server.tool(
    'carver-get-folder-items',
    'Get items (files and folders) in a specific project folder.',
    {
      projectName: z.string().describe('The name of the project.'),
      folderPath: z
        .string()
        .describe('The path of the folder to retrieve items from.'),
    },
    getFolderItemsTool
  );
}
