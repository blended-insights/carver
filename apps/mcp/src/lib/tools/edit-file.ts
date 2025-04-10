import z from 'zod';
import type { McpServer, ToolFunction } from '.';
import { CarverApiClient } from '@/lib/services';

interface EditFileProps {
  filePath: string;
  projectName: string;
  oldText: string;
  newText: string;
}

/**
 * Tool function to edit a file in a project by replacing oldText with newText
 * @param filePath Path of the file to edit
 * @param projectName Name of the project
 * @param oldText Text to be replaced
 * @param newText New text to insert
 * @returns Content object with the result of the operation
 */
const editFileTool: ToolFunction<EditFileProps> = async ({
  filePath,
  projectName,
  oldText,
  newText,
}) => {
  try {
    const apiClient = new CarverApiClient();

    // Write the updated content back to the file
    const result = await apiClient.updateProjectFile(
      projectName,
      filePath,
      oldText,
      newText
    );

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
    // Return the error as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              message: `Failed to edit file ${filePath}: ${
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
 * Register the edit-file tool with the MCP server
 * @param server MCP server instance
 */
export function registerEditFileTool(server: McpServer) {
  server.tool(
    'carver-edit-file',
    'Edit a file in a project by replacing oldText with newText.',
    {
      projectName: z.string().describe('The name of the project.'),
      filePath: z.string().describe('The path of the file to edit.'),
      oldText: z.string().describe('Text to be replaced.'),
      newText: z.string().describe('New text to insert.'),
    },
    editFileTool
  );
}
