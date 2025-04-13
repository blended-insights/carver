import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  filePath: z.string().describe('The path of the file to read.'),
  fields: z
    .array(z.enum(['content', 'hash', 'lastModified']))
    .optional()
    .describe(
      'Optional fields to include. Defaults to all fields if not specified.'
    ),
};

type Schema = typeof schema;

/**
 * Tool function to read a single file from a project
 * @param filePath Path of the file to read
 * @param projectName Name of the project
 * @param fields Optional fields to include (defaults to ['content', 'hash', 'lastModified'])
 * @returns Content object with the file data
 */
const readFileTool: ToolCallback<Schema> = async ({
  filePath,
  projectName,
  fields = ['content', 'hash', 'lastModified'],
}) => {
  try {
    const api = getApi();
    const fileData = await api.files.getProjectFile({
      projectName,
      filePath,
      fields,
    });

    // Return the file data as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(fileData, null, 2),
        },
      ],
    };
  } catch (error) {
    // Use the shared error handler to format the error
    return {
      content: [
        {
          type: 'text',
          text: formatErrorResponse(error, `Failed to read file ${filePath}`),
        },
      ],
    };
  }
};

/**
 * Register the read-file tool with the MCP server
 * @param server MCP server insstance
 */
export function registerReadFileTool(server: McpServer) {
  server.tool<Schema>(
    'carver-read-file',
    'Read a single file from a project.',
    schema,
    readFileTool
  );
}
