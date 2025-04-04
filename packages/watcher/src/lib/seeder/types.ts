/* eslint-disable @typescript-eslint/no-namespace */

/**
 * Represents a project node in the graph database
 */
export interface ProjectNode {
  name: string;        // Unique constraint
  rootPath: string;
}

/**
 * Represents a file node in the graph database
 */
export interface FileNode {
  path: string;        // Unique constraint
  name: string;
  extension: string;
  content: string;
}

/**
 * Represents a directory node in the graph database
 */
export interface DirectoryNode {
  path: string;        // Unique constraint
  name: string;
}

/**
 * Represents a function node in the graph database
 */
export interface FunctionNode {
  name: string;
  filePath: string;    // Indexed with name
  lineStart: number;
  lineEnd: number;
  parameters: string[];
}

/**
 * Represents a class node in the graph database
 */
export interface ClassNode {
  name: string;        // Indexed with filePath
  filePath: string;
  lineStart: number;
  lineEnd: number;
  methods: string[];
  properties: string[];
}

/**
 * Represents a variable node in the graph database
 */
export interface VariableNode {
  name: string;
  filePath: string;
  type: string;
  line: number;
}

/**
 * Represents an import node in the graph database
 */
export interface ImportNode {
  source: string;
  filePath: string;
  line: number;
}

/**
 * Represents an export node in the graph database
 */
export interface ExportNode {
  name: string;
  filePath: string;
  line: number;
  isDefault: boolean;
}

/**
 * Relationship types in the graph database
 */
export namespace Relationships {
  /**
   * Represents a CONTAINS relationship
   * Project CONTAINS Directory
   * Project CONTAINS File
   * Directory CONTAINS Directory
   * Directory CONTAINS File
   */
  export interface Contains {
    from: ProjectNode | DirectoryNode;
    to: DirectoryNode | FileNode;
  }

  /**
   * Represents a DEFINES relationship
   * File DEFINES Function
   * File DEFINES Variable
   * File DEFINES Import
   * File DEFINES Export
   */
  export interface Defines {
    from: FileNode;
    to: FunctionNode | VariableNode | ImportNode | ExportNode | ClassNode;
  }

  /**
   * Represents a CALLS relationship
   * Function CALLS Function
   */
  export interface Calls {
    from: FunctionNode;
    to: FunctionNode;
  }
}

/**
 * Complete structure of the codebase graph
 */
export interface CodebaseGraph {
  nodes: {
    projects: ProjectNode[];
    directories: DirectoryNode[];
    files: FileNode[];
    functions: FunctionNode[];
    classes: ClassNode[];
    variables: VariableNode[];
    imports: ImportNode[];
    exports: ExportNode[];
  };
  relationships: {
    contains: Relationships.Contains[];
    defines: Relationships.Defines[];
    calls: Relationships.Calls[];
  };
}
