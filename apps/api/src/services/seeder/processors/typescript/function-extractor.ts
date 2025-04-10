import { SourceFile, SyntaxKind, Node } from 'ts-morph';
import { FileNode, FunctionNode } from '@/interfaces';

/**
 * Extracts function declarations from TypeScript files
 */
export class FunctionExtractor {
  /**
   * Extract functions from a TypeScript source file
   * @param file File node being processed
   * @param sourceFile ts-morph SourceFile instance
   * @returns Array of extracted function nodes
   */
  static extract(file: FileNode, sourceFile: SourceFile): FunctionNode[] {
    const functions: FunctionNode[] = [];

    // Process regular function declarations
    const functionDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.FunctionDeclaration
    );
    for (const declaration of functionDeclarations) {
      const name = declaration.getName() || 'anonymous';
      const startLine = declaration.getStartLineNumber();
      const endLine = declaration.getEndLineNumber();
      const parameters = declaration
        .getParameters()
        .map((param) => param.getName());

      functions.push({
        name,
        filePath: file.path,
        lineStart: startLine,
        lineEnd: endLine,
        parameters,
      });
    }

    // Process arrow functions assigned to variables
    const variableDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.VariableDeclaration
    );
    for (const declaration of variableDeclarations) {
      const initializer = declaration.getInitializer();
      if (initializer && Node.isArrowFunction(initializer)) {
        const name = declaration.getName();
        const startLine = declaration.getStartLineNumber();
        const endLine = initializer.getEndLineNumber();
        const parameters = initializer
          .getParameters()
          .map((param) => param.getName());

        functions.push({
          name,
          filePath: file.path,
          lineStart: startLine,
          lineEnd: endLine,
          parameters,
        });
      }
    }

    // Process class method declarations
    const classDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.ClassDeclaration
    );
    for (const classDecl of classDeclarations) {
      const className = classDecl.getName() || 'anonymous';
      const methods = classDecl.getMethods();

      for (const method of methods) {
        const name = method.getName();
        const startLine = method.getStartLineNumber();
        const endLine = method.getEndLineNumber();
        const parameters = method.getParameters().map((param) => param.getName());

        // Create a separate function node for each class method
        functions.push({
          name,
          filePath: file.path,
          lineStart: startLine,
          lineEnd: endLine,
          parameters,
          // Reference to the containing class
          className,
        });
      }
    }

    return functions;
  }

  /**
   * Analyze function calls within a file
   * @param functions Array of functions in the file
   * @param sourceFile ts-morph SourceFile instance
   * @returns Array of caller-callee relationships
   */
  static analyzeCalls(
    functions: FunctionNode[],
    sourceFile: SourceFile
  ): { caller: string; callee: string }[] {
    const functionCalls: { caller: string; callee: string }[] = [];
    const functionNames = new Set(functions.map((fn) => fn.name));

    // Check for function calls within all function bodies
    for (const func of functions) {
      // Find nodes related to the current function
      let functionNode: Node | undefined;

      // Try to find function declaration
      const functionDeclarations = sourceFile.getDescendantsOfKind(
        SyntaxKind.FunctionDeclaration
      );
      functionNode = functionDeclarations.find(
        (fn) => fn.getName() === func.name
      );

      // If not found, try to find arrow function
      if (!functionNode) {
        const variableDeclarations = sourceFile.getDescendantsOfKind(
          SyntaxKind.VariableDeclaration
        );
        for (const decl of variableDeclarations) {
          if (decl.getName() === func.name) {
            const initializer = decl.getInitializer();
            if (initializer && Node.isArrowFunction(initializer)) {
              functionNode = initializer;
              break;
            }
          }
        }
      }

      // If function node was found, look for call expressions
      if (functionNode) {
        const callExpressions = functionNode.getDescendantsOfKind(
          SyntaxKind.CallExpression
        );

        for (const call of callExpressions) {
          const expression = call.getExpression();
          const calledFunctionName = expression.getText();

          // Check if the called function is one of our tracked functions
          if (
            functionNames.has(calledFunctionName) &&
            calledFunctionName !== func.name
          ) {
            functionCalls.push({
              caller: func.name,
              callee: calledFunctionName,
            });
          }
        }
      }
    }

    return functionCalls;
  }
}
