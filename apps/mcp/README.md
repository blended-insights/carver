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

| Option | Alias | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Enable verbose logging |
| `--debug` | `-d` | Enable debug mode |
| `--host <address>` | `-H` | Host address for HTTP transport (defaults to localhost) |
| `--port <number>` | `-p` | Port for HTTP transport (if used instead of stdio) |
| `--config <path>` | `-c` | Path to configuration file |
| `--log-level <level>` | `-l` | Log level (error, warn, info, debug) |
| `--help` | `-h` | Display help information |
| `--version` | | Display version information |

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

| Variable | Description |
|----------|-------------|
| `CARVER_VERBOSE` | Set to "true" to enable verbose logging |
| `CARVER_DEBUG` | Set to "true" to enable debug mode |
| `CARVER_HOST` | Host address for HTTP transport |
| `CARVER_PORT` | Port number for HTTP transport |
| `CARVER_LOG_LEVEL` | Log level (error, warn, info, debug) |
| `NODE_ENV` | Environment (development, production, test) |

## Configuration Priority

Configuration options are applied with the following priority (highest to lowest):
1. Command-line arguments
2. Environment variables
3. Configuration file
4. Default values
