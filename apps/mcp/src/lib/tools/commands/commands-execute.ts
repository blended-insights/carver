import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project'),
  command: z
    .string()
    .describe('Command to execute (must be in the allowed list)'),
  args: z
    .array(z.string())
    .optional()
    .describe('Array of arguments to pass to the command'),
};

type Schema = typeof schema;

/**
 * Tool function to execute a command in a project's root directory
 * @param projectName Name of the project
 * @param command Command to execute (must be in the allowed list)
 * @param args Optional array of arguments to pass to the command
 * @returns Content object with the command execution results
 */
const commandsExecuteTool: ToolCallback<Schema> = async ({
  projectName,
  command,
  args = [],
}) => {
  try {
    const api = getApi();
    const executionResult = await api.commands.executeCommand({
      projectName,
      command,
      args,
    });

    // Return the execution result as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(executionResult, null, 2),
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
            `Failed to execute command '${command}' in project ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the commands-execute tool with the MCP server
 * @param server MCP server instance
 */
export function registerCommandsExecuteTool(server: McpServer) {
  server.tool<Schema>(
    'carver-commands-execute',
    "Execute a command in a project's root directory",
    schema,
    commandsExecuteTool
  );
}
