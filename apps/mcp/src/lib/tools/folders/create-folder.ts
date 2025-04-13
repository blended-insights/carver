import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  folderPath: z.string().describe('The path of the folder to create.'),
};

type Schema = typeof schema;

/**
 * Tool function to create a folder in a project
 * @param projectName Name of the project
 * @param folderPath Path of the folder to create
 * @returns Content object with the result of the operation
 */
const createFolderTool: ToolCallback<Schema> = async ({
  projectName,
  folderPath,
}) => {
  try {
    const api = getApi();

    // Call the API endpoint to create the folder
    const response = await api.folders.createProjectFolder({
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
    // Use the shared error handler to format the error
    return {
      content: [
        {
          type: 'text',
          text: formatErrorResponse(error, `Failed to create folder ${folderPath}`),
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
  server.tool<Schema>(
    'carver-create-folder',
    'Create a new folder in a project.',
    schema,
    createFolderTool
  );
}
