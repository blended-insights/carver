import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '@/lib/logger';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  filePaths: z.array(z.string()).describe('The paths of the files to read.'),
  fields: z
    .array(z.enum(['content', 'hash', 'lastModified']))
    .optional()
    .describe(
      'Optional fields to include for each file. Defaults to all fields if not specified.'
    ),
};

type Schema = typeof schema;

/**
 * Tool function to read multiple files from a project
 * @param filePaths Array of file paths to read
 * @param projectName Name of the project
 * @param fields Optional fields to include (defaults to ['content', 'hash', 'lastModified'])
 * @returns Content object with the file data
 */
const readMultipleFilesTool: ToolCallback<Schema> = async ({
  filePaths,
  projectName,
  fields = ['content', 'hash', 'lastModified'],
}) => {
  try {
    const api = getApi();

    // Process files concurrently with Promise.all
    const responses = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const fileData = await api.files.getProjectFile({
            projectName,
            filePath,
            fields,
          });

          return {
            path: filePath,
            ...fileData,
            error: false,
          };
        } catch (err) {
          // Handle individual file errors but continue processing others
          logger.error(`Error reading file ${filePath}:`, { err });
          return {
            path: filePath,
            error: true,
            message: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );

    const text = JSON.stringify(responses, null, 2);
    return { content: [{ type: 'text', text }] };
  } catch (error) {
    // Use the shared error handler to format the error
    return {
      content: [
        {
          type: 'text',
          text: formatErrorResponse(error, `Failed to read multiple files`),
        },
      ],
    };
  }
};

/**
 * Register the read-multiple-files tool with the MCP server
 * @param server MCP server instance
 */
export function registerReadMultipleFilesTool(server: McpServer) {
  server.tool<Schema>(
    'carver-read-multiple-files',
    'Read multiple files from a project.',
    schema,
    readMultipleFilesTool
  );
}
