import { Project, SourceFile } from 'ts-morph';
import { FileNode } from '@/interfaces';

/**
 * Manages ts-morph project instances for analyzing TypeScript files
 */
export class TsMorphProjectManager {
  /**
   * Create a ts-morph Project with the provided files
   * @param fileNodes Array of file nodes to add to the project
   * @returns Configured ts-morph Project instance
   */
  static createProject(fileNodes: FileNode[]): Project {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        allowJs: true,
        target: 3, // ES2015
        strictNullChecks: true,
        noImplicitAny: true,
        moduleResolution: 2, // NodeJs
        resolveJsonModule: true,
        esModuleInterop: true,
      },
    });

    // Add all files to the in-memory file system
    fileNodes.forEach((file) => {
      project.createSourceFile(file.path, file.content);
    });

    return project;
  }

  /**
   * Get the source file object for a file node
   * @param project ts-morph Project instance
   * @param fileNode File node to get the source file for
   * @returns SourceFile instance or undefined if not found
   */
  static getSourceFile(
    project: Project,
    fileNode: FileNode
  ): SourceFile | undefined {
    return project.getSourceFile(fileNode.path);
  }
}
