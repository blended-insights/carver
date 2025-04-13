import z from 'zod';
import type { McpServer, ToolFunction } from '..';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '../utils/error-handler';

interface SearchFilesProps {
  projectName: string;
  searchTerm: string;
  searchType?: 'function' | 'import' | 'directory' | undefined;
}

/**
 * Tool function to search for files in a project
 * @param projectName Name of the project
 * @param searchTerm Term to search for in file paths, functions, imports, or directories
 * @param searchType Optional type of search: 'function', 'import', 'directory', or undefined for general search
 * @returns Content object with the search results
 */
const searchFilesTool: ToolFunction<SearchFilesProps> = async ({
  projectName,
  searchTerm,
  searchType,
}) => {
  try {
    const api = getApi();
    const searchResults = await api.files.getProjectFiles({
      projectName,
      searchTerm,
      searchType,
    });

    // Return the search results as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true, 
              message: `Found ${searchResults.length} file(s) matching '${searchTerm}'${
                searchType ? ` in ${searchType} search` : ''
              }`,
              data: searchResults
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
          text: formatErrorResponse(
            error, 
            `Failed to search files in project ${projectName} for term '${searchTerm}'`
          ),
        },
      ],
    };
  }
};

/**
 * Register the search-files tool with the MCP server
 * @param server MCP server instance
 */
export function registerSearchFilesTool(server: McpServer) {
  server.tool(
    'carver-search-files',
    'Search for files in a project based on search term and optional search type.',
    {
      projectName: z.string().describe('The name of the project.'),
      searchTerm: z
        .string()
        .describe(
          'Term to search for in file paths, functions, imports, or directories.'
        ),
      searchType: z
        .enum(['function', 'import', 'directory'])
        .optional()
        .describe(
          'Optional type of search: "function" for function definitions, "import" for import statements, "directory" for file paths within specific directories. If not specified, performs a general file path search.'
        ),
    },
    searchFilesTool
  );
}
