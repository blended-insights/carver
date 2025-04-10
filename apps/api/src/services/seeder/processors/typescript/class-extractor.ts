import { SourceFile, SyntaxKind } from 'ts-morph';
import { FileNode, ClassNode } from '@/interfaces';

/**
 * Extracts class declarations from TypeScript files
 */
export class ClassExtractor {
  /**
   * Extract classes from a TypeScript source file
   * @param file File node being processed
   * @param sourceFile ts-morph SourceFile instance
   * @returns Array of extracted class nodes
   */
  static extract(file: FileNode, sourceFile: SourceFile): ClassNode[] {
    const classes: ClassNode[] = [];

    const classDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.ClassDeclaration
    );

    for (const classDecl of classDeclarations) {
      const name = classDecl.getName() || 'anonymous';
      const startLine = classDecl.getStartLineNumber();
      const endLine = classDecl.getEndLineNumber();

      // Extract methods
      const methods = classDecl.getMethods().map((method) => method.getName());

      // Extract properties
      const properties = classDecl.getProperties().map((prop) => prop.getName());

      classes.push({
        name,
        filePath: file.path,
        lineStart: startLine,
        lineEnd: endLine,
        methods,
        properties,
      });
    }

    return classes;
  }
}
