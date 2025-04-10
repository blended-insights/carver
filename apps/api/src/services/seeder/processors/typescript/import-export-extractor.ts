import { SourceFile, SyntaxKind, Node } from 'ts-morph';
import { FileNode, ImportNode, ExportNode } from '@/interfaces';

/**
 * Extracts import and export declarations from TypeScript files
 */
export class ImportExportExtractor {
  /**
   * Extract imports from a TypeScript source file
   * @param file File node being processed
   * @param sourceFile ts-morph SourceFile instance
   * @returns Array of extracted import nodes
   */
  static extractImports(file: FileNode, sourceFile: SourceFile): ImportNode[] {
    const imports: ImportNode[] = [];

    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const source = importDecl.getModuleSpecifier().getLiteralText();
      const line = importDecl.getStartLineNumber();

      imports.push({
        source,
        filePath: file.path,
        line,
      });
    }

    return imports;
  }

  /**
   * Extract exports from a TypeScript source file
   * @param file File node being processed
   * @param sourceFile ts-morph SourceFile instance
   * @returns Array of extracted export nodes
   */
  static extractExports(file: FileNode, sourceFile: SourceFile): ExportNode[] {
    const exports: ExportNode[] = [];

    // Handle named exports (export declarations)
    const exportDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.ExportDeclaration
    );
    for (const exportDecl of exportDeclarations) {
      const namedExports = exportDecl.getNamedExports();

      for (const namedExport of namedExports) {
        const name = namedExport.getName();
        const line = exportDecl.getStartLineNumber();

        exports.push({
          name,
          filePath: file.path,
          line,
          isDefault: false,
        });
      }
    }

    // Handle "export default" assignments
    const exportAssignments = sourceFile.getDescendantsOfKind(
      SyntaxKind.ExportAssignment
    );
    for (const exportAssign of exportAssignments) {
      if (exportAssign.isExportEquals()) {
        continue; // Skip "export = x" syntax
      }

      const expression = exportAssign.getExpression();
      let name = expression.getText();

      // For complex expressions, just use a placeholder
      if (
        Node.isObjectLiteralExpression(expression) ||
        Node.isArrayLiteralExpression(expression)
      ) {
        name = 'default';
      }

      exports.push({
        name,
        filePath: file.path,
        line: exportAssign.getStartLineNumber(),
        isDefault: true,
      });
    }

    // Handle "export" modifiers on declarations

    // Export in variable declarations
    const variableStatements = sourceFile.getDescendantsOfKind(
      SyntaxKind.VariableStatement
    );
    for (const statement of variableStatements) {
      if (statement.hasExportKeyword()) {
        const declarations = statement.getDeclarations();

        for (const declaration of declarations) {
          exports.push({
            name: declaration.getName(),
            filePath: file.path,
            line: statement.getStartLineNumber(),
            isDefault: statement.hasDefaultKeyword(),
          });
        }
      }
    }

    // Export in function declarations
    const functionDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.FunctionDeclaration
    );
    for (const declaration of functionDeclarations) {
      if (declaration.hasExportKeyword()) {
        exports.push({
          name: declaration.getName() || 'anonymous',
          filePath: file.path,
          line: declaration.getStartLineNumber(),
          isDefault: declaration.hasDefaultKeyword(),
        });
      }
    }

    // Export in class declarations
    const classDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.ClassDeclaration
    );
    for (const declaration of classDeclarations) {
      if (declaration.hasExportKeyword()) {
        exports.push({
          name: declaration.getName() || 'anonymous',
          filePath: file.path,
          line: declaration.getStartLineNumber(),
          isDefault: declaration.hasDefaultKeyword(),
        });
      }
    }

    return exports;
  }
}
