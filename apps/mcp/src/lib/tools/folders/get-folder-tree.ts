import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';

interface GetFolderTreeProps {
  projectName: string;
  folderPath: string;
  depth?: number;
}

/**
 * Tool function to get a recursive tree view of a project folder
 * @param projectName Name of the project
 * @param folderPath Path of the folder to retrieve tree for
 * @param depth Optional depth of recursion (defaults to full recursion)
 * @returns Recursive tree structure of folder contents
 */
const getFolderTreeTool: ToolFunction<GetFolderTreeProps> = async ({
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
    // Return the error as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              message: `Failed to retrieve folder tree for ${folderPath}: ${
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
 * Register the get-folder-tree tool with the MCP server
 * @param server MCP server instance
 */
export function registerGetFolderTreeTool(server: McpServer) {
  server.tool(
    'carver-get-folder-tree',
    "Get a recursive tree view of a project folder's contents.",
    {
      projectName: z.string().describe('The name of the project.'),
      folderPath: z
        .string()
        .describe('The path of the folder to retrieve tree for.'),
      // depth: z.number().int().positive().optional().describe('Optional maximum depth of recursion. Defaults to full recursion.'),
    },
    getFolderTreeTool
  );
}
