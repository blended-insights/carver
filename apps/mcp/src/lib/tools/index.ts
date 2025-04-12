export type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type ToolFunction<TArgs> = (props: TArgs) => Promise<{
  content: [{ type: 'text'; text: string }];
}>;

export * from './create-folder';
export * from './edit-file';
export * from './get-file-imports';
export * from './get-folder-items';
export * from './get-folder-tree';
export * from './read-file';
export * from './read-multiple-files';
export * from './search-files';
export * from './update-file';
export * from './write-file';
