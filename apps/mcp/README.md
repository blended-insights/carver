# Carver MCP (Model Context Protocol) Server

The Carver MCP server provides file operations and project management capabilities over the Model Context Protocol.

## Getting Started

To run the MCP server in development mode:

```sh
npm run mcp:dev
```

To build and run in production mode:

```sh
npx nx run mcp:build --configuration=production
node dist/apps/mcp/main.js
```

## Command-Line Arguments

The MCP server supports the following command-line arguments:

| Option                | Alias | Description                                             |
| --------------------- | ----- | ------------------------------------------------------- |
| `--verbose`           | `-v`  | Enable verbose logging                                  |
| `--debug`             | `-d`  | Enable debug mode                                       |
| `--host <address>`    | `-H`  | Host address for HTTP transport (defaults to localhost) |
| `--port <number>`     | `-p`  | Port for HTTP transport (if used instead of stdio)      |
| `--config <path>`     | `-c`  | Path to configuration file                              |
| `--log-level <level>` | `-l`  | Log level (error, warn, info, debug)                    |
| `--help`              | `-h`  | Display help information                                |
| `--version`           |       | Display version information                             |

Examples:

```sh
# Run with verbose logging
node dist/apps/mcp/main.js --verbose

# Run with a custom configuration file
node dist/apps/mcp/main.js --config ./custom-config.json

# Run with debug mode and set log level
node dist/apps/mcp/main.js --debug --log-level debug

# Run with custom host and port
node dist/apps/mcp/main.js --host 0.0.0.0 --port 8080
```

## Available MCP Tools

The Carver MCP server provides the following tools:

### File Operations

| Tool Name                    | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `carver-read-file`           | Read a single file from a project                                           |
| `carver-read-multiple-files` | Read multiple files from a project                                          |
| `carver-write-file`          | Write content to a file in a project                                        |
| `carver-update-file`         | Update a file in a project using line-based PATCH operations                |
| `carver-create-folder`       | Create a new folder in a project                                            |
| `carver-get-folder-items`    | Get items (files and folders) in a specific project folder                  |
| `carver-get-folder-tree`     | Get a recursive tree view of a project folder's contents                    |
| `carver-get-file-imports`    | Get imports from a specific file in a project                               |
| `carver-search-files`        | Search for files in a project based on search term and optional search type |

### Git Operations

| Tool Name           | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `git_status`        | Shows the working tree status                                  |
| `git_diff_unstaged` | Shows changes in the working directory that are not yet staged |
| `git_diff_staged`   | Shows changes that are staged for commit                       |
| `git_diff`          | Shows differences between branches or commits                  |
| `git_commit`        | Records changes to the repository                              |
| `git_add`           | Adds file contents to the staging area                         |
| `git_reset`         | Unstages all staged changes                                    |
| `git_log`           | Shows the commit logs                                          |
| `git_create_branch` | Creates a new branch from an optional base branch              |
| `git_checkout`      | Switches branches                                              |
| `git_show`          | Shows the contents of a commit                                 |

### Prompts

The Carver MCP server provides the following prompt generators:

| Prompt Name                 | Description                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `carver-bug-report-prompt`  | Generates a formatted bug report with description, expected and actual results                         |
| `carver-enhancement-prompt` | Generates a formatted enhancement request with description, affected files, and optional justification |

## Configuration File

You can provide a configuration file using the `--config` option. The file should be a JSON file with the following structure:

```json
{
  "verbose": false,
  "debug": false,
  "logLevel": "info",
  "environment": "development",
  "port": 9230
}
```

See `config.example.json` for a template.

## Environment Variables

The following environment variables are supported:

| Variable           | Description                                 |
| ------------------ | ------------------------------------------- |
| `CARVER_VERBOSE`   | Set to "true" to enable verbose logging     |
| `CARVER_DEBUG`     | Set to "true" to enable debug mode          |
| `CARVER_HOST`      | Host address for HTTP transport             |
| `CARVER_PORT`      | Port number for HTTP transport              |
| `CARVER_LOG_LEVEL` | Log level (error, warn, info, debug)        |
| `NODE_ENV`         | Environment (development, production, test) |

## Configuration Priority

Configuration options are applied with the following priority (highest to lowest):

1. Command-line arguments
2. Environment variables
3. Configuration file
4. Default values

## API Client Architecture

The Carver MCP API client is organized in a modular structure for better maintainability and separation of concerns:

```
apps/mcp/src/lib/services/api/
├── client.ts     # Core CarverApiClient with HTTP methods
├── file.ts       # File-related API operations
├── folder.ts     # Folder-related API operations
├── git.ts        # Git-related API operations
├── index.ts      # Main exports and integrated CarverApi client
├── project.ts    # Project-related API operations
└── types.ts      # Type definitions for all API interactions
```

### Usage Examples

```typescript
// Import the full API client
import { getApi } from 'apps/mcp/src/lib/services/api';

// Get the API singleton instance
const api = getApi();

// Use the API with namespaced methods
const files = await api.files.getProjectFiles({ projectName: 'myProject' });
const status = await api.git.getGitStatus({ projectName: 'myProject' });

// Import specific clients directly if needed
import { FileApiClient } from 'apps/mcp/src/lib/services/api';
import { CarverApiClient } from 'apps/mcp/src/lib/services/api';

const apiClient = new CarverApiClient();
const fileClient = new FileApiClient(apiClient);
```
