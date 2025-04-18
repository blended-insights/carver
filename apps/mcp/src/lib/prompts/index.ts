import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerBugReportPrompt } from './bug-report';
import { registerEnhancementPrompt } from './enhancement';

export function registerPrompts(server: McpServer): void {
  registerBugReportPrompt(server);
  registerEnhancementPrompt(server);
}

