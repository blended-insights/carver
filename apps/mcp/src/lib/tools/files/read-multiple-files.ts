import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApiClient } from '@/lib/services';

interface ReadMultipleFilesProps {
  filePaths: string[];
  projectName: string;
  fields?: Array<'content' | 'hash' | 'lastModified'>;
}

/**
 * Tool function to read multiple files from a project
 * @param filePaths Array of file paths to read
 * @param projectName Name of the project
 * @param fields Optional fields to include (defaults to ['content', 'hash', 'lastModified'])
 * @returns Content object with the file data
 */
const readMultipleFilesTool: ToolFunction<ReadMultipleFilesProps> = async ({
  filePaths,
  projectName,
  fields = ['content', 'hash', 'lastModified'],
}) => {
  try {
    const apiClient = getApiClient();
    const responses = await Promise.all(
      filePaths.map((filePath) =>
        apiClient.getProjectFile({ projectName, filePath, fields })
      )
    );

    // Format the response with file paths for easier identification
    const formattedResponses = responses.map((response, index) => ({
      path: filePaths[index],
      ...response,
    }));

    const text = JSON.stringify(formattedResponses, null, 2);
    return { content: [{ type: 'text', text }] };
  } catch (error) {
    // Return the error as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              message: `Failed to read files: ${
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
 * Register the read-multiple-files tool with the MCP server
 * @param server MCP server instance
 */
export function registerReadMultipleFilesTool(server: McpServer) {
  server.tool(
    'carver-read-multiple-files',
    'Read multiple files from a project.',
    {
      projectName: z.string().describe('The name of the project.'),
      filePaths: z
        .array(z.string())
        .describe('The paths of the files to read.'),
      fields: z
        .array(z.enum(['content', 'hash', 'lastModified']))
        .optional()
        .describe(
          'Optional fields to include for each file. Defaults to all fields if not specified.'
        ),
    },
    readMultipleFilesTool
  );
}
