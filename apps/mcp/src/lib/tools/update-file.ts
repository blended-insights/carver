import z from 'zod';
import type { McpServer, ToolFunction } from '.';
import { getApiClient } from '@/lib/services';
import { PatchProjectFileParams } from '@/lib/services/api';

interface UpdateFileProps {
  projectName: string;
  filePath: string;
  startLine: number;
  endLine?: number;
  content?: string;
  operation?: 'replace' | 'insert' | 'delete';
}

/**
 * Tool function to update a file in a project using PATCH operations
 * @param projectName Id of the project
 * @param filePath Path of the file to update
 * @param startLine Start line number (1-based)
 * @param endLine End line number (1-based, inclusive, required for replace/delete)
 * @param content New content (required for replace/insert)
 * @param operation Type of operation: 'replace' (default), 'insert', or 'delete'
 * @returns Content object with the result of the operation
 */
const updateFileTool: ToolFunction<UpdateFileProps> = async ({
  projectName,
  filePath,
  startLine,
  endLine,
  content,
  operation = 'replace',
}) => {
  try {
    // Validate operation type
    if (!['replace', 'insert', 'delete'].includes(operation)) {
      throw new Error('Operation must be one of: replace, insert, delete');
    }

    // Validate required parameters based on operation
    if ((operation === 'replace' || operation === 'delete') && !endLine) {
      throw new Error('endLine is required for replace and delete operations');
    }

    if ((operation === 'replace' || operation === 'insert') && !content) {
      throw new Error('content is required for replace and insert operations');
    }

    // URL encode the file path to handle special characters correctly
    const encodedFilePath = encodeURIComponent(filePath);

    // Prepare the request payload
    const payload: PatchProjectFileParams = {
      filePath: encodedFilePath,
      projectName,
      startLine,
      operation,
    };

    // Add optional parameters as needed
    if (endLine !== undefined) {
      payload.endLine = endLine;
    }

    if (content !== undefined) {
      payload.content = content;
    }

    const apiClient = getApiClient();

    // Call the API endpoint to patch the file
    const response = await apiClient.patchProjectFile(payload);

    // Return the result as a formatted response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `File ${filePath} successfully updated with ${operation} operation.`,
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
              message: `Failed to update file ${filePath}: ${
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
 * Register the update-file tool with the MCP server
 * @param server MCP server instance
 */
export function registerUpdateFileTool(server: McpServer) {
  server.tool(
    'carver-update-file',
    'Update a file in a project using line-based PATCH operations.',
    {
      projectName: z.string().describe('The name of the project.'),
      filePath: z.string().describe('The path of the file to update.'),
      startLine: z
        .number()
        .int()
        .positive()
        .describe('Start line number (1-based).'),
      endLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'End line number (1-based, inclusive, required for replace/delete operations).'
        ),
      content: z
        .string()
        .optional()
        .describe('New content (required for replace and insert operations).'),
      operation: z
        .enum(['replace', 'insert', 'delete'])
        .optional()
        .describe('Type of operation: replace (default), insert, or delete.'),
    },
    updateFileTool
  );
}
