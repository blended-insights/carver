import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  filePath: z.string().describe('The path of the file to update.'),
  startLine: z
    .number()
    .int()
    .positive()
    .describe('The first line to replace (inclusive)'),
  endLine: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('The last line to replace (inclusive)'),
  newContent: z
    .string()
    .optional()
    .describe(
      'The entire new content that will replace lines startLine through endLine'
    ),
  operation: z
    .enum(['replace', 'insert', 'delete'])
    .optional()
    .describe('Type of operation: replace (default), insert, or delete.'),
};

type Schema = typeof schema;

/**
 * Tool function to update a file in a project using PATCH operations
 * @param projectName Id of the project
 * @param filePath Path of the file to update
 * @param startLine Start line number (1-based)
 * @param endLine End line number (1-based, inclusive, required for replace/delete)
 * @param newContent New content (required for replace/insert)
 * @param operation Type of operation: 'replace' (default), 'insert', or 'delete'
 * @returns Content object with the result of the operation
 */
const updateFileTool: ToolCallback<Schema> = async ({
  projectName,
  filePath,
  startLine,
  endLine,
  newContent,
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

    if ((operation === 'replace' || operation === 'insert') && !newContent) {
      throw new Error('content is required for replace and insert operations');
    }

    const api = getApi();

    // Call the API endpoint to patch the file
    const response = await api.files.patchProjectFile({
      projectName,
      filePath,
      startLine,
      endLine,
      newContent,
      operation,
    });

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
    // Use the shared error handler to format the error
    return {
      content: [
        {
          type: 'text',
          text: formatErrorResponse(error, `Failed to update file ${filePath}`),
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
  server.tool<Schema>(
    'carver-update-file',
    'Update a file in a project using line-based PATCH operations.',
    schema,
    updateFileTool
  );
}
