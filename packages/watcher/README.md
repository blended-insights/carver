# Carver Watcher Service

A file system watcher service that monitors code repositories, builds a knowledge graph, and publishes file change events to Redis.

## Features

- Lists available folders from a configured mount path
- Starts file watchers for requested folders
- Seeds a Neo4j graph database with code structure information
- Publishes file change events to Redis
- Manages watcher processes (start, restart, kill)

## Architecture

The application follows a services-oriented architecture with well-defined interfaces:

- **Services Layer**: Contains domain-specific services for Neo4j, Redis, and file system operations
- **Library Layer**: Contains core business logic for watching files and seeding the graph database
- **API Layer**: Exposes HTTP endpoints using Fastify

## API Endpoints

### List Available Folders

```
GET /folders
```

Returns a list of available folders from the `USER_MOUNT` environment variable.

### Start Watcher

```
POST /folders/:folderPath/start?project=project-name
```

Starts a new file watcher process for the specified folder. The `project` parameter is optional and will be derived from the folder path if not provided.

### Restart Watcher

```
POST /watchers/:processId/restart
```

Restarts an existing file watcher process by its process ID.

### Kill Watcher

```
POST /watchers/:processId/kill
```

Stops and removes a file watcher process by its process ID.

### Watchers

```
GET /watchers
```

Returns details of all active watcher processes including their process IDs, folder paths, and project names.

### Get Specific Watcher

```
GET /watchers/{processId}
```

Returns details about a specific watcher process by its process ID. If the watcher doesn't exist, returns a 404 error.

## Redis Events

The service publishes the following events to Redis:

### file.change

Published when a file is added, modified, or deleted in a watched folder.

```json
{
  "processId": "watcher-id",
  "eventType": "add|change|unlink",
  "filePath": "relative/path/to/file",
  "timestamp": 1650000000000
}
```

### watcher.status

Published when a watcher process changes status.

```json
{
  "processId": "watcher-id",
  "status": "seeding|seeded|started|restarting|restarted|killed|error",
  "message": "Status message",
  "timestamp": 1650000000000
}
```

## Environment Variables

- `USER_MOUNT`: Root directory containing available folders to watch
- `PORT`: HTTP server port (default: 4000)
- `HOST`: HTTP server host (default: localhost)
- `REDIS_URL`: Redis server URL (default: redis://localhost:6379)
- `NEO4J_URI`: Neo4j server URI
- `NEO4J_USERNAME`: Neo4j username
- `NEO4J_PASSWORD`: Neo4j password

## Development

1. Install dependencies:
   ```
   npm install
   ```

2. Run in development mode with auto-reload:
   ```
   npm run dev
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Start the server:
   ```
   npm start
   ```

## Testing

Run unit tests with:

```
npm test
```

Run tests with coverage:

```
npm run test:coverage
```

The project includes unit tests for:
- Service implementations
- Watcher management
- File system operations
- Redis operations
- Neo4j operations
