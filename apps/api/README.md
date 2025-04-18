# Carver API

The Carver API package provides a RESTful API for the Carver codebase assistant using Express.js. This service serves as a drop-in replacement for the Fastify-based watcher API.

## Recent Updates

- **April 14, 2025**: Removed versioning from Neo4j graph database for simpler structure. This improves performance and maintainability by eliminating the need to track relationships across versions.
- **April 14, 2025**: Made `path` property on File node unique to ensure data consistency and prevent duplicate entries.
- **April 14, 2025**: Fixed bug where Git commit operations were failing due to missing user identity. The Git service now automatically configures user.name and user.email from environment variables (GIT_USER_NAME, GIT_USER_EMAIL) or uses default values.
- **April 14, 2025**: Fixed bug in the folders endpoint where it was returning all folders across the graph instead of only those for the specified project. Updated Neo4j queries to properly filter directories by project path relationships.
- **April 14, 2025**: Fixed critical bug in the file text replacement endpoint (`PUT /projects/:projectId/files/:fileId`) that was causing valid replacements to fail, especially with template literals and complex multi-line text. Replaced regex-based matching with exact string matching for improved reliability. See `apps/api/docs/FILE_EDIT_FIX.md` for details.
- **April 13, 2025**: Added command tools to MCP: carver-commands-list and carver-commands-execute. Enhanced API with corresponding endpoints to allow command execution within project directories.
- **April 12, 2025**: Enhanced file creation/update endpoint to store file data in Redis before queueing. This improves reliability by ensuring file data is persisted even if the queue processing is delayed or fails.
- **April 11, 2025**: Fixed reliability issue in the file processing queue where jobs would occasionally not be executed. Implemented a robust Redis-based locking mechanism and sequential job processing to ensure 100% job execution.
- **April 10, 2025**: Fixed bug in GET_DIRECTORY_TREE_BY_PATH query to correctly return a recursive directory tree with all children and their descendants. The query now uses a similar approach to GET_ITEMS_BY_DIRECTORY but retrieves the entire subtree.
- **April 10, 2025**: Enhanced file editing endpoint to improve reliability when text replacement fails. Now validates text replacements against Redis content and provides content previews when matches fail.
- **April 08, 2025**: Fixed bug where class methods were not being indexed as separate function nodes. Class methods can now be queried directly using `MATCH (n:Function {name: 'methodName'})` syntax in Neo4j.
- **April 08, 2025**: Fixed issue with the GET_ITEMS_BY_DIRECTORY query where file items were incorrectly showing directory type. Files now correctly display with their actual filename and file type in the API response.

## Overview

This Express.js application includes routes for:

- Folder management and file watching
- Project exploration and search
- Watcher process management
- Admin functionality for Redis and Neo4j management

## Directory Structure

The API follows a hierarchical cascading router structure:

```
src/
├── routes/                      # All API routes
│   ├── index.ts                 # Main router that mounts top-level routes
│   ├── root.ts                  # Root endpoint (/)
│   ├── admin/                   # Admin routes
│   │   ├── index.ts             # Admin router
│   │   ├── neo4j/               # Neo4j admin operations
│   │   │   ├── index.ts         # Neo4j router
│   │   │   └── clear/           # Clear Neo4j database
│   │   └── redis/               # Redis admin operations
│   │       ├── index.ts         # Redis router
│   │       └── flush/           # Flush Redis database
│   ├── folders/                 # Folder management
│   │   ├── index.ts             # Folders router
│   │   └── :folderPath/         # Operations on specific folders
│   │       └── start/           # Start watching a folder
│   ├── projects/                # Project management
│   │   ├── index.ts             # Project router
│   │   └── :projectId/          # Operations on specific projects
│   │       ├── index.ts         # Project ID router
│   │       ├── files/           # List files in a project
│   │       └── search/          # Search within a project
│   └── watchers/                # Watcher process management
│       ├── index.ts             # Watchers router
│       └── :processId/          # Operations on specific watcher processes
│           ├── index.ts         # Process ID router
│           ├── kill/            # Kill a watcher process
│           └── restart/         # Restart a watcher process
└── main.ts                      # Express application entry point
```

## Router Structure

// routes/watchers/index.ts - Watchers router
router.use('/:processId', processIdRouter);

// routes/watchers/:processId/index.ts - Process ID router
router.use('/kill', killRouter);
router.use('/restart', restartRouter);

````

This approach makes the route organization more modular and maintainable.

- **Verification Steps**: File operations include verification to ensure completeness

See the full documentation in `apps/api/src/docs/QUEUE_SYSTEM_UPDATED.md` for details.

## REST-Compliant Search

The API implements REST-compliant search functionality on the `/projects/:projectId/files` endpoint. Instead of having a separate `/search` endpoint, search functionality is implemented as query parameters on the resource endpoint.

### Architecture

- **Redis-based File Storage**: Files are stored in Redis using the pattern `project:${projectName}:file:${relativeFilePath}`
- **Basic Path Search**: For simple file path searches, Redis's pattern matching capabilities are utilized
- **Advanced Search**: For more complex searches, Neo4j graph queries are used:
  - `function` search: Finds files that define functions matching the search term
  - `import` search: Finds files that import modules matching the search term
  - `directory` search: Finds files in directories matching the search term

### Implementation Notes

- Search validation ensures terms are at least 2 characters long
- The API uses Neo4j for advanced search capabilities while relying on Redis for basic file retrieval
- The implementation separates search logic into dedicated service methods, making it extensible
- The old `/search` endpoint is marked as deprecated; clients should migrate to the new REST-compliant endpoint

## API Endpoints

### Root

- `GET /` - Basic health check, returns a welcome message

### Folders

- `GET /folders` - List all available folders from USER_MOUNT environment variable
- `POST /folders/:folderPath/start` - Start watching a specific folder

### Projects

- `GET /projects/:projectId/files` - Get all files for a specific project
- `GET /projects/:projectId/files?search=<term>` - Search for files matching the term (REST compliant search)
  - Query Parameters:
    - `search` - Term to search for (minimum 2 characters)
    - `type` - Optional search type (function, import, directory)
  - Examples:
    - Basic search: `/projects/myproject/files?search=utils`
    - Function search: `/projects/myproject/files?search=getProject&type=function`
    - Import search: `/projects/myproject/files?search=express&type=import`
    - Directory search: `/projects/myproject/files?search=src/utils&type=directory`
- `GET /projects/:projectId/files/:fileId` - Get a specific file from a project with optional field selection
  - Query Parameters: `fields` - Comma-separated list of fields to include (content, hash, lastModified)
  - Example: `/projects/myproject/files/src/main.ts?fields=content,hash`
- `POST /projects/:projectId/files/:fileId` - Create or update a file through the queue system
  - Request Body: JSON object with `content` property
  - Process Flow:
    - File data is immediately stored in Redis for quick access
    - File processing job is then added to the queue for disk write
  - Response:
    - 202 Accepted with a job ID for status tracking
  - Example: `POST /projects/myproject/files/src/main.ts` with `{"content": "console.log('hello');"}`
- `GET /projects/:projectId/files/:fileId/status/:jobId` - Check the status of a queued file operation
  - Response: Information about the job status including state, result, and timestamps
- `PUT /projects/:projectId/files/:fileId` - Replace text in a file with improved reliability
  - Request Body: JSON object with `oldText` and `newText` properties
  - Response:
    - 200 OK if text was replaced successfully in Redis
    - 400 Bad Request if text to replace was not found in content (includes content preview for debugging)
    - 202 Accepted if file not found in Redis and replacement was queued
  - Example: `PUT /projects/myproject/files/src/main.ts` with `{"oldText": "old code", "newText": "new code"}`
- `PATCH /projects/:projectId/files/:fileId` - Modify file content by line numbers
  - Request Body: JSON object with:
    - `startLine`: Start line number (1-based, required for all operations)
    - `endLine`: End line number (1-based, inclusive, required for replace/delete)
    - `content`: New content (required for replace/insert, ignored for delete)
    - `operation`: Type of operation: 'replace' (default), 'insert', or 'delete'
  - Response:
    - 200 OK if lines were modified successfully in Redis
    - 400 Bad Request if line numbers are invalid (includes line count for debugging)
    - 202 Accepted if file not found in Redis and operation was queued
  - Examples:
    - Replace lines: `PATCH /projects/myproject/files/src/main.ts` with `{"startLine": 10, "endLine": 15, "content": "// new content", "operation": "replace"}`
    - Insert line: `PATCH /projects/myproject/files/src/main.ts` with `{"startLine": 10, "content": "// inserted line", "operation": "insert"}`
    - Delete lines: `PATCH /projects/myproject/files/src/main.ts` with `{"startLine": 10, "endLine": 15, "operation": "delete"}`
- `GET /projects/:projectId/commands` - Get information about allowed commands
  - Response:
    - 200 OK with list of allowed commands and configuration information
    - Example response: `{"success":true,"data":{"allowedCommands":["npm","npx","yarn","pnpm"],"config":{"source":"environment","rawValue":"npm,npx,yarn,pnpm"}}}`
- `POST /projects/:projectId/commands` - Execute a command in the project's root directory
  - Request Body: JSON object with:
    - `command`: The command to execute (must be in the allowed list)
    - `args`: Array of arguments to pass to the command
  - Environment Configuration:
    - `ALLOWED_COMMANDS`: Comma-separated list of allowed commands (default: "npm,npx,yarn,pnpm")
  - Response:
    - 200 OK with stdout, stderr, and exitCode if command executed successfully
    - 400 Bad Request if command is missing or args is not an array
    - 403 Forbidden if the specified command is not in the allowed list
    - 404 Not Found if the project does not exist
    - 500 Internal Server Error for other execution errors
  - Example: `POST /projects/myproject/commands` with `{"command": "npm", "args": ["run", "lint"]}`

### Watchers

- `GET /watchers` - Get status of all active file watcher processes
- `GET /watchers/:processId` - Get details of a specific watcher process
- `POST /watchers/:processId/kill` - Kill a specific watcher process
- `POST /watchers/:processId/restart` - Restart a specific watcher process

### Admin

- `POST /admin/redis/flush` - Flush all Redis data
- `POST /admin/neo4j/clear` - Clear Neo4j database and recreate constraints

## Development

### Running the API

```bash
# Run in development mode
npm run dev:api

# Build the project
npx nx build api
````

### Adding New Routes

To add a new route to the API:

1. Create a new directory in the appropriate location under `src/routes/`
2. Create an `index.ts` file with a router that handles your endpoint
3. Make sure to use `Router({ mergeParams: true })` if the route needs access to parent params
4. Import and mount your router in the parent router's `index.ts` file

Example for a new route:

```typescript
// src/routes/watchers/:processId/logs/index.ts
import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  const { processId } = req.params;
  // Implementation...
});

export default router;

// Then in src/routes/watchers/:processId/index.ts:
import logsRouter from './logs';
// ...
router.use('/logs', logsRouter);
```
