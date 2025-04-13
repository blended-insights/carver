import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerBugReportPrompt } from './bug-report';

export function registerPrompts(server: McpServer): void {
  registerBugReportPrompt(server);
}
