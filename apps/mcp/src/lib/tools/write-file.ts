import z from 'zod';
import type { McpServer, ToolFunction } from '.';
import { CarverApiClient } from '@/lib/services';

interface WriteFileProps {
  filePath: string;
  projectName: string;
  content: string;
}

/**
 * Tool function to write a file to a project
 * @param filePath Path of the file to write
 * @param projectName Name of the project
 * @param content Content to write to the file
 * @returns Content object with the result of the operation
 */
const writeFileTool: ToolFunction<WriteFileProps> = async ({
  filePath,
  projectName,
  content,
}) => {
  try {
    const apiClient = new CarverApiClient();
    const result = await apiClient.writeProjectFile(projectName, filePath, content);
    
    // Return the result as a formatted response
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify(result, null, 2) 
      }] 
    };
  } catch (error) {
    // Return the error as a formatted result
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ 
          error: true, 
          message: `Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}` 
        }, null, 2) 
      }] 
    };
  }
};

/**
 * Register the write-file tool with the MCP server
 * @param server MCP server instance
 */
export function registerWriteFileTool(server: McpServer) {
  server.tool(
    'carver-write-file',
    'Write content to a file in a project.',
    {
      projectName: z.string().describe('The name of the project.'),
      filePath: z.string().describe('The path of the file to write.'),
      content: z.string().describe('Content to write to the file.'),
    },
    writeFileTool
  );
}
