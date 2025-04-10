import z from 'zod';
import type { McpServer, ToolFunction } from '.';
import { CarverApiClient } from '@/lib/services';

interface ReadFileProps {
  filePath: string;
  projectName: string;
  fields?: Array<'content' | 'hash' | 'lastModified'>;
}

/**
 * Tool function to read a single file from a project
 * @param filePath Path of the file to read
 * @param projectName Name of the project
 * @param fields Optional fields to include (defaults to ['content', 'hash', 'lastModified'])
 * @returns Content object with the file data
 */
const readFileTool: ToolFunction<ReadFileProps> = async ({
  filePath,
  projectName,
  fields = ['content', 'hash', 'lastModified'],
}) => {
  try {
    const apiClient = new CarverApiClient();
    const fileData = await apiClient.getProjectFile(projectName, filePath, fields);
    
    // Return the file data as a formatted result
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify(fileData, null, 2) 
      }] 
    };
  } catch (error) {
    // Return the error as a formatted result
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ 
          error: true, 
          message: `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}` 
        }, null, 2) 
      }] 
    };
  }
};

/**
 * Register the read-file tool with the MCP server
 * @param server MCP server instance
 */
export function registerReadFileTool(server: McpServer) {
  server.tool(
    'carver-read-file',
    'Read a single file from a project.',
    {
      projectName: z.string().describe('The name of the project.'),
      filePath: z.string().describe('The path of the file to read.'),
      fields: z.array(
        z.enum(['content', 'hash', 'lastModified'])
      ).optional().describe('Optional fields to include. Defaults to all fields if not specified.'),
    },
    readFileTool
  );
}
