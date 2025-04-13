import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  filePath: z.string().describe('The path of the file to edit.'),
  oldText: z.string().describe('Text to be replaced.'),
  newText: z.string().describe('New text to insert.'),
};

type Schema = typeof schema;

/**
 * Tool function to edit a file in a project by replacing oldText with newText
 * @param filePath Path of the file to edit
 * @param projectName Name of the project
 * @param oldText Text to be replaced
 * @param newText New text to insert
 * @returns Content object with the result of the operation
 */
const editFileTool: ToolCallback<Schema> = async ({
  filePath,
  projectName,
  oldText,
  newText,
}) => {
  try {
    const api = getApi();

    // Write the updated content back to the file
    const result = await api.files.updateProjectFile({
      projectName,
      filePath,
      oldText,
      newText,
    });

    // Return the result as a formatted response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `File ${filePath} successfully edited.`,
              data: result,
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
          text: formatErrorResponse(error, `Failed to edit file ${filePath}`),
        },
      ],
    };
  }
};

/**
 * Register the edit-file tool with the MCP server
 * @param server MCP server instance
 */
export function registerEditFileTool(server: McpServer) {
  server.tool<Schema>(
    'carver-edit-file',
    'Edit a file in a project by replacing oldText with newText.',
    schema,
    editFileTool
  );
}
