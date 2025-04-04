# Development Guide for Carver Watcher Service

This document provides guidelines and instructions for developers working on the Carver Watcher service.

## Project Structure

The project follows a services-oriented architecture:

```
src/
├── app/
│   ├── plugins/        # Fastify plugins
│   └── routes/         # API route handlers
├── interfaces/         # TypeScript interfaces for service contracts
├── lib/
│   ├── seeder/   # Code analysis and graph database seeding
│   └── watcher/        # File watcher implementation
├── services/
│   ├── neo4j.service.ts        # Neo4j database operations
│   ├── redis.service.ts        # Redis operations
│   └── filesystem.service.ts   # File system operations
├── tests/              # Unit tests
├── utils/
│   └── logger.ts       # Logging utility
└── main.ts             # Application entry point
```

## Service Interfaces

The project uses TypeScript interfaces to define service contracts:

### IFileSystemService

```typescript
interface IFileSystemService {
  calculateHash(content: string): string;
  getAllFilesFromDisk(rootPath: string): { relativePath: string; content: string }[];
  convertToFileNode(file: { relativePath: string; content: string }): FileNode;
  directoryExists(dirPath: string): boolean;
  listDirectories(dirPath: string): { name: string; path: string; size: number }[];
  filterTypeScriptFiles(files: FileNode[]): FileNode[];
  filterLargeFiles(files: FileNode[], maxSize?: number): FileNode[];
}
```

### IRedisService

```typescript
interface IRedisService {
  getClient(): Redis;
  close(): Promise<void>;
  getProjectFileKeys(projectName: string): Promise<string[]>;
  getFileHash(projectName: string, filePath: string): Promise<string | null>;
  storeFileData(projectName: string, filePath: string, content: string, hash: string): Promise<void>;
  deleteFileData(projectName: string, filePath: string): Promise<void>;
  publishFileChange(processId: string, eventType: 'add' | 'change' | 'unlink', filePath: string): Promise<void>;
  publishStatus(processId: string, status: string, message?: string): Promise<void>;
}
```

### INeo4jService

The `INeo4jService` interface defines methods for all Neo4j database operations, including:
- Creating constraints and indexes
- Managing project and version nodes
- Handling file operations
- Tracking code entities (functions, classes, variables)
- Managing relationships between entities

### IWatcherManager

```typescript
interface IWatcherManager {
  startWatcher(folderPath: string, projectName: string): Promise<string>;
  restartWatcher(processId: string): Promise<boolean>;
  killWatcher(processId: string): Promise<boolean>;
  getActiveWatchers(): { processId: string; folderPath: string; projectName: string }[];
  getActiveWatcherIds(): string[];
  cleanup(): Promise<void>;
}
```

## Testing

The project uses Jest for unit testing. Each service has its own test suite.

### Test Structure

Tests are organized by service:
- `filesystem.service.spec.ts`: Tests for file system operations
- `redis.service.spec.ts`: Tests for Redis operations
- `neo4j.service.spec.ts`: Tests for Neo4j operations
- `watcher.spec.ts`: Tests for watcher management

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npm test -- src/tests/filesystem.service.spec.ts
```

### Mocking

Tests use Jest's mocking capabilities to isolate dependencies:
- External libraries like `ioredis`, `neo4j-driver`, and `chokidar` are mocked
- Service dependencies are mocked when testing components that use them
- File system operations are mocked to avoid actual disk access

### Test Setup

A common test setup file (`src/tests/setup.ts`) is used to:
- Set environment variables for testing
- Mock console methods to reduce noise in test output
- Configure global Jest settings

## Development Workflow

1. **Setup Environment Variables**

   Create a `.env` file with the following variables:

   ```
   USER_MOUNT=/path/to/mounted/folders
   PORT=4000
   HOST=localhost
   REDIS_URL=redis://localhost:6379
   NEO4J_URI=neo4j://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your-password
   ```

2. **Dependencies**

   Ensure Redis and Neo4j are running locally or update the environment variables to point to your instances.

3. **Development Server**

   For development with hot-reloading:

   ```bash
   # From the monorepo root
   nx serve watcher
   ```

   Or use the local dev script:

   ```bash
   npm run dev
   ```

4. **Testing**

   Run tests with:

   ```bash
   # From the monorepo root
   nx test watcher
   ```

   Or directly:

   ```bash
   npm test
   ```

5. **Building**

   Build the project with:

   ```bash
   # From the monorepo root
   nx build watcher
   ```

   Or directly:

   ```bash
   npm run build
   ```

## Adding New Features

### Adding a New Service

1. Define an interface in `src/interfaces/services.interface.ts`
2. Create a new service file in `src/services/`
3. Implement the interface in the service class
4. Create unit tests in `src/tests/`
5. Export the service singleton from `src/services/index.ts`

### Extending an Existing Service

1. Update the service interface in `src/interfaces/services.interface.ts`
2. Add the new methods to the service implementation
3. Add unit tests for the new methods
4. Update any components that use the service

### Testing Best Practices

1. Test each method individually
2. Mock external dependencies
3. Test both success and error scenarios
4. Use descriptive test names
5. Organize tests using `describe` and `it` blocks
6. Aim for high test coverage (especially for critical paths)

## Performance Considerations

- File watching can be resource-intensive. Use the `ignored` option in Chokidar to exclude unnecessary files and directories.
- Large repositories may cause performance issues. Consider implementing pagination or limiting the depth of analysis.
- Redis pub/sub is not guaranteed delivery - ensure your subscribers handle missed messages gracefully.
- Use connection pooling for Neo4j to improve performance when handling multiple requests.
