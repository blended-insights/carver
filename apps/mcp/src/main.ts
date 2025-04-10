/**
 * Main entry point for the Carver MCP (Model Context Protocol) server.
 * This file sets up the server, registers resources and tools,
 * and establishes the communication transport.
 */

// Import core MCP server functionality
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// Import transport layer (stdio for command-line communication)
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import tool registrations from tools module
import {
  registerReadFileTool,
  registerReadMultipleFilesTool,
  registerSearchFilesTool,
  registerGetFileImportsTool,
  registerWriteFileTool,
  registerEditFileTool,
  registerGetFolderTreeTool,
  registerGetFolderItemsTool,
} from './lib/tools';

// Import resource registrations from resources module
import { registerCarverProjectFilesResource } from './lib/resources';

// Create server instance with name, version and capability declarations
const server = new McpServer({
  name: 'carver', // Server name
  version: '1.0.0', // Server version
  capabilities: {
    // Declare supported capabilities
    resources: {}, // Resources will be registered at runtime
    tools: {}, // Tools will be registered at runtime
  },
});

// Register the project files resource
registerCarverProjectFilesResource(server);

// Register file operation tools
registerEditFileTool(server); // Tool for editing file content
registerGetFileImportsTool(server); // Tool for extracting imports from files
registerGetFolderItemsTool(server); // Tool for retrieving folder items
registerGetFolderTreeTool(server); // Tool for retrieving folder tree
registerReadFileTool(server); // Tool for reading single files
registerReadMultipleFilesTool(server); // Tool for reading multiple files at once
registerSearchFilesTool(server); // Tool for searching file contents
registerWriteFileTool(server); // Tool for writing file content

/**
 * Main function that initializes and starts the server
 * Uses stdio for transport layer communication
 */
async function main() {
  // Initialize stdio transport
  const transport = new StdioServerTransport();

  // Connect the server to the transport layer
  await server.connect(transport);

  // Log successful startup (using stderr as stdout is used for the protocol)
  console.error('Carver MCP Server running on stdio 💥');
}

// Start the server and handle any fatal errors
main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1); // Exit with error code
});
