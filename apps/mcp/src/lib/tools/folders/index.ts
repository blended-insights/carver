/**
 * Folder-related tools for Carver MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerCreateFolderTool } from './create-folder';
import { registerGetFolderItemsTool } from './get-folder-items';
import { registerGetFolderTreeTool } from './get-folder-tree';

/**
 * Register all Folder-related tools with the MCP server
 * @param server MCP server instance
 */
export function registerFolderTools(server: McpServer): void {
  registerCreateFolderTool(server);
  registerGetFolderItemsTool(server);
  registerGetFolderTreeTool(server);
}
