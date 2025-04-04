# Service Interfaces in Carver Watcher

This document outlines the service interfaces implemented in the Carver Watcher service and their benefits.

## Overview

Service interfaces provide a contract between service providers and consumers. They define the methods and properties that a service must implement, ensuring consistency and type safety across the application.

## Key Interfaces

### IFileSystemService

This interface defines operations related to file system interactions:

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

**Responsibilities:**
- File content hashing
- Directory traversal
- File content reading
- Directory existence checking
- File filtering

### IRedisService

This interface defines operations related to Redis interactions:

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

**Responsibilities:**
- Redis connection management
- File data storage and retrieval
- File hash management
- Event publishing

### INeo4jService

This interface defines operations related to Neo4j graph database interactions:

```typescript
interface INeo4jService {
  getSession(): neo4j.Session;
  close(): Promise<void>;
  createConstraintsAndIndexes(session: neo4j.Session): Promise<void>;
  createOrGetProject(session: neo4j.Session, projectName: string, rootPath: string): Promise<void>;
  createVersion(session: neo4j.Session, versionName: string, projectName: string): Promise<void>;
  markFileAsDeleted(session: neo4j.Session, filePath: string, versionName: string): Promise<void>;
  createFileVersionRelationship(session: neo4j.Session, filePath: string, versionName: string): Promise<void>;
  linkEntityToVersion(
    session: neo4j.Session,
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
  getActiveWatchers(): { processId: string; folderPath: string; projectName: string }[];
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

```typescript
// Consumer code uses the interface, not the concrete implementation
constructor(private fileSystemService: IFileSystemService) {}

async processFolder(folderPath: string): Promise<void> {
  if (!this.fileSystemService.directoryExists(folderPath)) {
    throw new Error(`Directory does not exist: ${folderPath}`);
  }

  const files = this.fileSystemService.getAllFilesFromDisk(folderPath);
  const tsFiles = this.fileSystemService.filterTypeScriptFiles(
    files.map(f => this.fileSystemService.convertToFileNode(f))
  );
  
  // Process TypeScript files...
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
  
  getAllFilesFromDisk(rootPath: string): { relativePath: string; content: string }[] {
    // Mock implementation for testing
    return [
      { relativePath: 'file1.ts', content: 'content1' },
      { relativePath: 'file2.ts', content: 'content2' }
    ];
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

By implementing service interfaces in the Carver Watcher service, we have improved the overall architecture and made it easier to add new features and maintain existing ones.
