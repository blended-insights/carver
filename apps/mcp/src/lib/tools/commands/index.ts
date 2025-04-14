/**
 * Command-related tools for Carver MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerCommandsListTool } from './commands-list';
import { registerCommandsExecuteTool } from './commands-execute';

/**
 * Register all Command-related tools with the MCP server
 * @param server MCP server instance
 */
export function registerCommandTools(server: McpServer): void {
  registerCommandsListTool(server);
  registerCommandsExecuteTool(server);
}
