import { Project, SourceFile, Node, SyntaxKind } from "ts-morph";
import type {
  FileNode,
  ImportNode,
  FunctionNode,
  VariableNode,
  ExportNode,
  ClassNode,
} from "./types";

/**
 * Initializes a ts-morph Project for analyzing TypeScript files
 */
export function createTsMorphProject(fileNodes: FileNode[]): Project {
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
 * Gets the source file object for a file node
 */
export function getSourceFile(project: Project, fileNode: FileNode): SourceFile | undefined {
  return project.getSourceFile(fileNode.path);
}

/**
 * Gets TypeNode string representation with fallback
 */
function getTypeAsString(node: Node): string {
  // For variable declarations
  if (Node.isVariableDeclaration(node)) {
    const typeNode = node.getTypeNode();
    if (typeNode) {
      return typeNode.getText();
    }

    // Try to use type checker to infer type
    try {
      const type = node.getType();
      const typeText = type.getText();

      // Only use inferred type if it's meaningful
      if (typeText && typeText !== "any" && typeText !== "unknown") {
        return typeText;
      }
    } catch (error) {
      // Fall back to initializer-based inference
    }

    // Infer from initializer if possible
    const initializer = node.getInitializer();
    if (initializer) {
      if (
        initializer.getKind() === SyntaxKind.TrueKeyword ||
        initializer.getKind() === SyntaxKind.FalseKeyword
      )
        return "boolean";
      if (Node.isStringLiteral(initializer)) return "string";
      if (Node.isNumericLiteral(initializer)) return "number";
      if (Node.isArrayLiteralExpression(initializer)) {
        // Try to determine array element types
        const elements = initializer.getElements();
        if (elements.length > 0) {
          if (Node.isStringLiteral(elements[0])) return "string[]";
          if (Node.isNumericLiteral(elements[0])) return "number[]";
          // Try to use type checker for complex arrays
          try {
            const arrayType = initializer.getType().getText();
            if (arrayType && arrayType !== "any[]") {
              return arrayType;
            }
          } catch (error) {
            // Fall back to generic array
          }
        }
        return "any[]";
      }
      if (Node.isObjectLiteralExpression(initializer)) {
        // For object literals, try to get the inferred type first
        try {
          const objType = initializer.getType().getText();
          if (objType && objType !== "object" && objType !== "any") {
            return objType;
          }
        } catch (error) {
          // Fall back to generic object
        }
        return "object";
      }
      if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
        // Try to get a more detailed function type
        try {
          const funcType = initializer.getType().getText();
          if (funcType && funcType !== "any") {
            return funcType;
          }
        } catch (error) {
          // Fall back to generic function
        }
        return "function";
      }

      // For other initializers, try once more with the type checker
      try {
        const initType = initializer.getType().getText();
        if (initType && initType !== "any" && initType !== "unknown") {
          return initType;
        }
      } catch (error) {
        // Fall back to unknown
      }
    }
  }

  // For parameters
  if (Node.isParameterDeclaration(node)) {
    const typeNode = node.getTypeNode();
    if (typeNode) {
      return typeNode.getText();
    }

    // Try using the type checker
    try {
      const paramType = node.getType().getText();
      if (paramType && paramType !== "any" && paramType !== "unknown") {
        return paramType;
      }
    } catch (error) {
      // Fall back to default value or unknown
    }
  }

  return "unknown";
}

/**
 * Extracts variables from a file using ts-morph
 */
export function extractVariables(file: FileNode, sourceFile: SourceFile): VariableNode[] {
  const variables: VariableNode[] = [];

  // Get all variable declarations
  const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

  for (const declaration of variableDeclarations) {
    // Skip arrow function variables, as these are handled by function extractor
    const initializer = declaration.getInitializer();
    if (initializer && Node.isArrowFunction(initializer)) {
      continue;
    }

    const name = declaration.getName();
    const pos = declaration.getStartLineNumber();
    const type = getTypeAsString(declaration);

    variables.push({
      name,
      filePath: file.path,
      type,
      line: pos,
    });
  }

  return variables;
}

/**
 * Extract function declarations from a file using ts-morph
 */
export function extractFunctions(file: FileNode, sourceFile: SourceFile): FunctionNode[] {
  const functions: FunctionNode[] = [];

  // Process regular function declarations
  const functionDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
  for (const declaration of functionDeclarations) {
    const name = declaration.getName() || "anonymous";
    const startLine = declaration.getStartLineNumber();
    const endLine = declaration.getEndLineNumber();
    const parameters = declaration.getParameters().map((param) => param.getName());

    functions.push({
      name,
      filePath: file.path,
      lineStart: startLine,
      lineEnd: endLine,
      parameters,
    });
  }

  // Process arrow functions assigned to variables
  const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  for (const declaration of variableDeclarations) {
    const initializer = declaration.getInitializer();
    if (initializer && Node.isArrowFunction(initializer)) {
      const name = declaration.getName();
      const startLine = declaration.getStartLineNumber();
      const endLine = initializer.getEndLineNumber();
      const parameters = initializer.getParameters().map((param) => param.getName());

      functions.push({
        name,
        filePath: file.path,
        lineStart: startLine,
        lineEnd: endLine,
        parameters,
      });
    }
  }

  // Method declarations are handled separately in class extraction

  return functions;
}

/**
 * Analyzes function calls within the file
 */
export function analyzeFunctionCalls(
  functions: FunctionNode[],
  sourceFile: SourceFile,
): { caller: string; callee: string }[] {
  const functionCalls: { caller: string; callee: string }[] = [];
  const functionNames = new Set(functions.map((fn) => fn.name));

  // Check for function calls within all function bodies
  for (const func of functions) {
    // Find nodes related to the current function
    let functionNode: Node | undefined;

    // Try to find function declaration
    const functionDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
    functionNode = functionDeclarations.find((fn) => fn.getName() === func.name);

    // If not found, try to find arrow function
    if (!functionNode) {
      const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
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
      const callExpressions = functionNode.getDescendantsOfKind(SyntaxKind.CallExpression);

      for (const call of callExpressions) {
        const expression = call.getExpression();
        const calledFunctionName = expression.getText();

        // Check if the called function is one of our tracked functions
        if (functionNames.has(calledFunctionName) && calledFunctionName !== func.name) {
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

/**
 * Extracts import statements from a file using ts-morph
 */
export function extractImports(file: FileNode, sourceFile: SourceFile): ImportNode[] {
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
 * Extracts export statements from a file using ts-morph
 */
export function extractExports(file: FileNode, sourceFile: SourceFile): ExportNode[] {
  const exports: ExportNode[] = [];

  // Handle named exports (export declarations)
  const exportDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.ExportDeclaration);
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
  const exportAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.ExportAssignment);
  for (const exportAssign of exportAssignments) {
    if (exportAssign.isExportEquals()) {
      continue; // Skip "export = x" syntax
    }

    const expression = exportAssign.getExpression();
    let name = expression.getText();

    // For complex expressions, just use a placeholder
    if (Node.isObjectLiteralExpression(expression) || Node.isArrayLiteralExpression(expression)) {
      name = "default";
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
  const variableStatements = sourceFile.getDescendantsOfKind(SyntaxKind.VariableStatement);
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
  const functionDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
  for (const declaration of functionDeclarations) {
    if (declaration.hasExportKeyword()) {
      exports.push({
        name: declaration.getName() || "anonymous",
        filePath: file.path,
        line: declaration.getStartLineNumber(),
        isDefault: declaration.hasDefaultKeyword(),
      });
    }
  }

  // Export in class declarations
  const classDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);
  for (const declaration of classDeclarations) {
    if (declaration.hasExportKeyword()) {
      exports.push({
        name: declaration.getName() || "anonymous",
        filePath: file.path,
        line: declaration.getStartLineNumber(),
        isDefault: declaration.hasDefaultKeyword(),
      });
    }
  }

  return exports;
}

/**
 * Extracts class declarations from a file using ts-morph
 */
export function extractClasses(file: FileNode, sourceFile: SourceFile): ClassNode[] {
  const classes: ClassNode[] = [];

  const classDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);

  for (const classDecl of classDeclarations) {
    const name = classDecl.getName() || "anonymous";
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
