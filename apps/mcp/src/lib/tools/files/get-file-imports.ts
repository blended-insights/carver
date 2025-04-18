import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  filePath: z.string().describe('The path of the file to get imports from.'),
};

type Schema = typeof schema;

/**
 * Tool function to get imports from a specific file in a project
 * @param filePath Path of the file to get imports from
 * @param projectName Name of the project
 * @returns Content object with an array of import sources
 */
const getFileImportsTool: ToolCallback<Schema> = async ({
  filePath,
  projectName,
}) => {
  try {
    const api = getApi();
    const fileImports = await api.files.getFileImports({
      projectName,
      filePath,
    });

    // Return the import data as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Successfully retrieved imports for file ${filePath}`,
              data: fileImports
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
          text: formatErrorResponse(error, `Failed to get imports for file ${filePath}`),
        },
      ],
    };
  }
};

/**
 * Register the get-file-imports tool with the MCP server
 * @param server MCP server instance
 */
export function registerGetFileImportsTool(server: McpServer) {
  server.tool<Schema>(
    'carver-get-file-imports',
    'Get imports from a specific file in a project.',
    schema,
    getFileImportsTool
  );
}
