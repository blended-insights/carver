/**
 * Main entry point for the Carver MCP (Model Context Protocol) server.
 * This file sets up the server, registers resources and tools,
 * and establishes the communication transport.
 */

// Import core MCP server functionality
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// Import transport layer (stdio for command-line communication)
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Load config first to get server options
import { getConfig } from './lib/config';
const config = getConfig();

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

// Import logger and services modules
import { logger } from './lib/logger';
import { initializeServices } from './lib/services';

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
  // Initialize transport layer
  const transport = new StdioServerTransport();

  // Connect the server to the transport layer
  await server.connect(transport);

  // Set up global configurations based on command line args
  if (config.debug) {
    process.env.DEBUG = 'true';
  }

  // Initialize services
  initializeServices();

  // Log startup information with appropriate verbosity
  logger.info('Carver MCP Server running on stdio 💥');

  if (config.verbose) {
    logger.debug('Server configuration details', {
      environment: config.environment,
      host: config.host,
      port: config.port,
      logLevel: config.logLevel,
    });
  }
}

// Start the server and handle any fatal errors
main().catch((error) => {
  logger.error('Fatal error in main()', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1); // Exit with error code
});
