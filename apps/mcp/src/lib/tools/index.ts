export type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type ToolFunction<TArgs> = (props: TArgs) => Promise<{
  content: [{ type: 'text'; text: string }];
}>;

// Folder-related tools
export * from './folders';

// File-related tools
export * from './files';

// Git-related tools
export * from './git';
