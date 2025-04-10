import { SourceFile, SyntaxKind, Node } from 'ts-morph';
import { FileNode, VariableNode } from '@/interfaces';
import { TypeUtils } from './type-utils';

/**
 * Extracts variable declarations from TypeScript files
 */
export class VariableExtractor {
  /**
   * Extract variables from a TypeScript source file
   * @param file File node being processed
   * @param sourceFile ts-morph SourceFile instance
   * @returns Array of extracted variable nodes
   */
  static extract(file: FileNode, sourceFile: SourceFile): VariableNode[] {
    const variables: VariableNode[] = [];

    // Get all variable declarations
    const variableDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.VariableDeclaration
    );

    for (const declaration of variableDeclarations) {
      // Skip arrow function variables, as these are handled by function extractor
      const initializer = declaration.getInitializer();
      if (initializer && Node.isArrowFunction(initializer)) {
        continue;
      }

      const name = declaration.getName();
      const pos = declaration.getStartLineNumber();
      const type = TypeUtils.getTypeAsString(declaration);

      variables.push({
        name,
        filePath: file.path,
        type,
        line: pos,
      });
    }

    return variables;
  }
}
