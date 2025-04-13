import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface CreateFolderProps {
  projectName: string;
  folderPath: string;
}

/**
 * Tool function to create a folder in a project
 * @param projectName Name of the project
 * @param folderPath Path of the folder to create
 * @returns Content object with the result of the operation
 */
const createFolderTool: ToolFunction<CreateFolderProps> = async ({
  projectName,
  folderPath,
}) => {
  try {
    const apiClient = getApiClient();

    // Call the API endpoint to create the folder
    const response = await apiClient.createProjectFolder({
      projectName,
      folderPath,
    });

    // Return the result as a formatted response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Folder ${folderPath} successfully created in project ${projectName}.`,
              data: response,
            },
            null,
            2
          ),
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
              message: `Failed to create folder ${folderPath}: ${
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
 * Register the create-folder tool with the MCP server
 * @param server MCP server instance
 */
export function registerCreateFolderTool(server: McpServer) {
  server.tool(
    'carver-create-folder',
    'Create a new folder in a project.',
    {
      projectName: z.string().describe('The name of the project.'),
      folderPath: z.string().describe('The path of the folder to create.'),
    },
    createFolderTool
  );
}
