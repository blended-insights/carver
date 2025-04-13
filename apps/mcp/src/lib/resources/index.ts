import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDocumentation } from './carver-documentation';

export function registerResources(server: McpServer) {
  registerDocumentation(server);
}
