import z from 'zod';
import { getApi } from '@/lib/services';
import { formatErrorResponse } from '@/lib/tools/utils';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

const schema = {
  projectName: z.string().describe('The name of the project.'),
};

type Schema = typeof schema;

/**
 * Tool function to list available commands for a project
 * @param projectName Name of the project
 * @returns Content object with the allowed commands information
 */
const commandsListTool: ToolCallback<Schema> = async ({ projectName }) => {
  try {
    const api = getApi();
    const commandsData = await api.commands.listCommands({
      projectName,
    });

    // Return the commands data as a formatted result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(commandsData, null, 2),
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
            `Failed to list commands for project ${projectName}`
          ),
        },
      ],
    };
  }
};

/**
 * Register the commands-list tool with the MCP server
 * @param server MCP server instance
 */
export function registerCommandsListTool(server: McpServer) {
  server.tool<Schema>(
    'carver-commands-list',
    'List available commands for a project',
    schema,
    commandsListTool
  );
}
