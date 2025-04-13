import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  filePath: z.string().describe('The path of the file to write.'),
  content: z.string().describe('Content to write to the file.'),
};

type Schema = typeof schema;

/**
 * Tool function to write a file to a project
 * @param filePath Path of the file to write
 * @param projectName Name of the project
 * @param content Content to write to the file
 * @returns Content object with the result of the operation
 */
const writeFileTool: ToolCallback<Schema> = async ({
  filePath,
  projectName,
  content,
}) => {
  try {
    const api = getApi();
    const result = await api.files.writeProjectFile({
      projectName,
      filePath,
      content,
    });

    // Return the result as a formatted response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `File ${filePath} successfully written.`,
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
          text: formatErrorResponse(error, `Failed to write file ${filePath}`),
        },
      ],
    };
  }
};

/**
 * Register the write-file tool with the MCP server
 * @param server MCP server instance
 */
export function registerWriteFileTool(server: McpServer) {
  server.tool<Schema>(
    'carver-write-file',
    'Write content to a file in a project.',
    schema,
    writeFileTool
  );
}
