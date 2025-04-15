# Service Interfaces in Carver Watcher

This document outlines the service interfaces implemented in the Carver Watcher service and their benefits.

## Updates and Changes

### April 14, 2025 - Git Service Enhancement for User Identity

- Fixed bug where Git commit operations were failing due to missing user identity
- Enhanced GitService to automatically configure user.name and user.email for all Git operations
- Added environment variable support for customizing Git identity:
  - `GIT_USER_EMAIL`: Email to use for Git operations (defaults to "carver@example.com")
  - `GIT_USER_NAME`: Name to use for Git operations (defaults to "Carver System")
- This change ensures all Git operations that require a user identity (such as commits) will work correctly
- The configuration is applied at the Git instance level, providing consistent identity across all Git operations

### April 13, 2025 - Command Execution Service and Endpoint

- Added new CommandExecutor service for secure command execution in project directories
- Implemented POST /projects/:projectId/commands endpoint for running shell commands
- Added security by restricting execution to an allowlist of safe commands through the ALLOWED_COMMANDS environment variable (defaults to "npm,npx,yarn,pnpm")
- Commands are executed in the project's root directory with appropriate error handling
- Implemented proper validation for command arguments and project existence
- Service can be easily configured by updating the environment variable without code changes

### April 10, 2025 - Directory Tree Query Improvement

- Fixed recursive directory tree query to correctly return all descendants
- Improved the GET_DIRECTORY_TREE_BY_PATH Cypher query to properly handle all levels of subdirectories
- The query now returns both the parent directory and all its children with correct typing
- Fix applies the pattern established by GET_ITEMS_BY_DIRECTORY but extends it to retrieve the entire subtree

### April 08, 2025 - Class Methods as Function Nodes

- Class methods are now extracted as both part of their parent class and as standalone function nodes
- This enables direct searching for methods by name using Neo4j queries
- Each function node representing a class method has an optional `className` property to track its parent class
- Cypher query `MATCH (n:Function {name: 'methodName'})` will find both standalone functions and class methods

## Overview

Service interfaces provide a contract between service providers and consumers. They define the methods and properties that a service must implement, ensuring consistency and type safety across the application.

## Key Interfaces

### IFileSystemService

This interface defines operations related to file system interactions:

```typescript
interface IFileSystemService {
  calculateHash(content: string): string;
  getAllFilesFromDisk(
    rootPath: string
  ): { relativePath: string; content: string }[];
  convertToFileNode(file: { relativePath: string; content: string }): FileNode;
  directoryExists(dirPath: string): boolean;
  listDirectories(
    dirPath: string
  ): { name: string; path: string; size: number }[];
  filterTypeScriptFiles(files: FileNode[]): FileNode[];
  filterLargeFiles(files: FileNode[], maxSize?: number): FileNode[];
  fileExists(filePath: string): boolean;
  readFileContent(filePath: string): string | null;
  isTypeScriptFile(file: { path: string; extension: string }): boolean;
  isSupportedExtension(extension: string): boolean;
}
```

**Responsibilities:**

- File content hashing
- Directory traversal
- File content reading
- Directory/file existence checking
- File filtering and type checking
- Single file access operations
- File extension validation

### IRedisService

This interface defines operations related to Redis interactions:

```typescript
interface IRedisService {
  getClient(): Redis;
  close(): Promise<void>;
  getProjectFileKeys(projectName: string): Promise<string[]>;
  getFileHash(projectName: string, filePath: string): Promise<string | null>;
  storeFileData(
    projectName: string,
    filePath: string,
    content: string,
    hash: string
  ): Promise<void>;
  deleteFileData(projectName: string, filePath: string): Promise<void>;
  publishFileChange(
    processId: string,
    eventType: 'add' | 'change' | 'unlink',
    filePath: string
  ): Promise<void>;
  publishStatus(
    processId: string,
    status: string,
    message?: string
  ): Promise<void>;
}
```

**Responsibilities:**

- Redis connection management
- File data storage and retrieval
- File hash management
- Event publishing

### INeo4jService

This interface defines operations related to Neo4j graph database interactions:

```typescript
interface INeo4jService {
  close(): Promise<void>;
  createConstraintsAndIndexes(): Promise<void>;
  createOrGetProject(projectName: string, rootPath: string): Promise<void>;
  createVersion(versionName: string, projectName: string): Promise<void>;
  markFileAsDeleted(filePath: string, versionName: string): Promise<void>;
  createFileVersionRelationship(
    filePath: string,
    versionName: string
  ): Promise<void>;
  linkEntityToVersion(
    entityType: 'Function' | 'Class' | 'Variable',
    name: string,
    filePath: string,
    versionName: string
  ): Promise<void>;
  // Additional methods for handling entities and relationships
  // ...
}
```

**Responsibilities:**

- Neo4j connection management
- Graph structure setup (constraints/indexes)
- Project and version management
- File tracking
- Code entity tracking
- Relationship management

### IWatcherManager

This interface defines operations related to file watcher management:

```typescript
interface IWatcherManager {
  startWatcher(folderPath: string, projectName: string): Promise<string>;
  restartWatcher(processId: string): Promise<boolean>;
  killWatcher(processId: string): Promise<boolean>;
  getActiveWatchers(): {
    processId: string;
    folderPath: string;
    projectName: string;
  }[];
  getActiveWatcherIds(): string[];
  cleanup(): Promise<void>;
}
```

**Responsibilities:**

- Starting file watchers
- Restarting file watchers
- Stopping file watchers
- Tracking active watchers
- Cleaning up resources

### ISeederFunction

This interface defines the contract for the seeder function used by the WatcherManager:

```typescript
interface ISeederFunction {
  (options: {
    root: string;
    project: string;
    filePath?: string;
    changeType?: 'add' | 'change' | 'unlink';
  }): Promise<{
    success: boolean;
    message: string;
  }>;
}
```

### ICommandExecutor

This interface defines operations related to secure command execution:

```typescript
interface ICommandExecutor {
  executeCommand(options: CommandExecutionOptions): Promise<CommandExecutionResult>;
}

interface CommandExecutionOptions {
  command: string;  // Command to execute (must be in allowlist)
  args: string[];   // Arguments to pass to the command
  cwd: string;      // Working directory where command will be executed
  timeout?: number; // Optional timeout in milliseconds
}

interface CommandExecutionResult {
  stdout: string;   // Standard output from the command
  stderr: string;   // Standard error from the command
  exitCode: number; // Exit code of the command
}
```

**Responsibilities:**

- Secure command execution with an allowlist
- Running commands in project directories
- Handling command execution errors
- Capturing command output (stdout/stderr)
- Setting appropriate timeout for commands

### FunctionNode Interface

The FunctionNode interface has been enhanced to support class methods:

```typescript
interface FunctionNode {
  name: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  parameters: string[];
  className?: string; // Optional field to track if this function is a class method
}
```

Class methods are now indexed as both:

1. Part of their parent class in the `methods` array
2. As standalone function nodes with a `className` reference

**Responsibilities:**

- Processing project files for graph database storage
- Creating version-tracked relationships
- Handling individual file changes
- Reporting processing status

## Benefits of Service Interfaces

### 1. Type Safety

Interfaces provide compile-time type checking, ensuring that:

- All required methods are implemented
- Method signatures match the expected types
- Return types are consistent

### 2. Code Documentation

Interfaces serve as self-documenting code:

- They clearly define the contract between components
- They provide a high-level overview of a service's capabilities
- They help new developers understand the system

### 3. Separation of Concerns

Interfaces promote separation of concerns:

- They define what a service does, not how it does it
- They allow different implementations of the same interface
- They make it easier to replace one implementation with another

### 4. Testability

Interfaces improve testability:

- They make it easier to mock dependencies
- They allow for simpler unit testing
- They enable clearer test boundaries

### 5. Maintainability

Interfaces enhance maintainability:

- They provide a stable contract that clients can depend on
- They make changes to implementation details less likely to break clients
- They make the codebase more modular and easier to refactor

## Usage Example

### Processing Only Changed Files

The Watcher service has been optimized to process only changed files rather than rescanning the entire project directory on every file change:

```typescript
// WatcherManager uses a seeder function that can handle specific file changes
watcher.on('change', async (filePath) => {
  const relativePath = path.relative(folderPath, filePath);
  logger.info(`File changed: ${relativePath}`);

  await redisService.publishFileChange(processId, 'change', relativePath);

  // Only reseed the specific file that was changed
  await this.seederFunction({
    root: folderPath,
    project: projectName,
    filePath: relativePath,
    changeType: 'change',
  });
});
```

```typescript
// The seeder function implements logic to handle individual files
async function handleSingleFileChange(
  rootPath: string,
  projectName: string,
  filePath: string,
  changeType: 'add' | 'change' | 'unlink',
  versionName: string
): Promise<{ success: boolean; message: string }> {
  // Process only the specific file
  // ...
}
```

### Reading Individual Files

The FileSystem service provides methods to efficiently access individual files:

```typescript
// Check if a file exists before attempting to process it
if (!fileSystemService.fileExists(fullPath)) {
  return {
    success: false,
    message: `File does not exist or is not accessible: ${fullPath}`,
  };
}

// Read the file content without traversing the entire directory
const content = fileSystemService.readFileContent(fullPath);
if (!content) {
  return {
    success: false,
    message: `Could not read content from file: ${fullPath}`,
  };
}

// Determine if the file is of a supported type
if (fileSystemService.isTypeScriptFile(fileNode)) {
  // Process TypeScript/JavaScript file
  // ...
}
```

### Executing Commands in Project Root

The CommandExecutor service provides a secure way to execute shell commands in a project's root directory:

```typescript
// In the command execution endpoint handler
router.post('/', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { command, args } = req.body;
  
  try {
    // Get project root path from Neo4j
    const project = await neo4jService.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Project not found with ID: ${projectId}`,
      });
    }
    
    // Execute the command with security checks
    const result = await commandExecutor.executeCommand({
      command,        // Only allowed commands will execute
      args: args || [],
      cwd: project.rootPath,
    });
    
    // Return the command result
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Handle execution errors
    // ...
  }
});
```

The CommandExecutor service implements security by restricting commands to a predefined allowlist from an environment variable:

```typescript
// From the CommandExecutor service
// Read from environment variable or use default value
const ALLOWED_COMMANDS = (process.env.ALLOWED_COMMANDS || 'npm,npx,yarn,pnpm')
  .split(',')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd !== '');

// Security check before execution
if (!ALLOWED_COMMANDS.includes(command)) {
  logger.warn(`Command execution blocked: ${command} is not in the allowed list`);
  throw new Error(`Command '${command}' is not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`);
}
```

## Testing with Interfaces

Interfaces make it easy to create mock implementations for testing:

```typescript
// Mock implementation for testing
class MockFileSystemService implements IFileSystemService {
  directoryExists(dirPath: string): boolean {
    // Mock implementation for testing
    return true;
  }

  fileExists(filePath: string): boolean {
    // Mock implementation for testing
    return true;
  }

  readFileContent(filePath: string): string | null {
    // Mock implementation for testing
    return 'export const hello = () => "world";';
  }

  // Other methods...
}

// In tests
const mockFileSystemService = new MockFileSystemService();
const sut = new SomeClassUnderTest(mockFileSystemService);

// Test the class using the mock service
```

## Conclusion

Service interfaces provide a strong foundation for building maintainable, testable, and type-safe applications. They define clear contracts between components, making the codebase more modular and easier to understand.

By implementing service interfaces in the Carver Watcher service, we have improved the overall architecture and made it easier to add new features and maintain existing ones. The recent optimizations to process only changed files demonstrate how well-defined interfaces allow for significant performance improvements without breaking existing functionality.