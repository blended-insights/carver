/**
 * File-related tools for Carver MCP
 */

import type { McpServer } from '..';

import { registerEditFileTool } from './edit-file';
import { registerGetFileImportsTool } from './get-file-imports';
import { registerReadFileTool } from './read-file';
import { registerReadMultipleFilesTool } from './read-multiple-files';
import { registerSearchFilesTool } from './search-files';
import { registerUpdateFileTool } from './update-file';
import { registerWriteFileTool } from './write-file';

/**
 * Register all File-related tools with the MCP server
 * @param server MCP server instance
 */
export function registerFileTools(server: McpServer): void {
  registerEditFileTool(server);
  registerGetFileImportsTool(server);
  registerReadFileTool(server);
  registerReadMultipleFilesTool(server);
  registerSearchFilesTool(server);
  registerUpdateFileTool(server);
  registerWriteFileTool(server);
}
