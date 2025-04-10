import { Node, SyntaxKind } from 'ts-morph';

/**
 * Utility functions for working with types in ts-morph
 */
export class TypeUtils {
  /**
   * Gets TypeNode string representation with fallback
   * @param node Node to extract type from
   * @returns String representation of the type
   */
  static getTypeAsString(node: Node): string {
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
        if (typeText && typeText !== 'any' && typeText !== 'unknown') {
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
          return 'boolean';
        if (Node.isStringLiteral(initializer)) return 'string';
        if (Node.isNumericLiteral(initializer)) return 'number';
        if (Node.isArrayLiteralExpression(initializer)) {
          // Try to determine array element types
          const elements = initializer.getElements();
          if (elements.length > 0) {
            if (Node.isStringLiteral(elements[0])) return 'string[]';
            if (Node.isNumericLiteral(elements[0])) return 'number[]';
            // Try to use type checker for complex arrays
            try {
              const arrayType = initializer.getType().getText();
              if (arrayType && arrayType !== 'any[]') {
                return arrayType;
              }
            } catch (error) {
              // Fall back to generic array
            }
          }
          return 'any[]';
        }
        if (Node.isObjectLiteralExpression(initializer)) {
          // For object literals, try to get the inferred type first
          try {
            const objType = initializer.getType().getText();
            if (objType && objType !== 'object' && objType !== 'any') {
              return objType;
            }
          } catch (error) {
            // Fall back to generic object
          }
          return 'object';
        }
        if (
          Node.isArrowFunction(initializer) ||
          Node.isFunctionExpression(initializer)
        ) {
          // Try to get a more detailed function type
          try {
            const funcType = initializer.getType().getText();
            if (funcType && funcType !== 'any') {
              return funcType;
            }
          } catch (error) {
            // Fall back to generic function
          }
          return 'function';
        }

        // For other initializers, try once more with the type checker
        try {
          const initType = initializer.getType().getText();
          if (initType && initType !== 'any' && initType !== 'unknown') {
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
        if (paramType && paramType !== 'any' && paramType !== 'unknown') {
          return paramType;
        }
      } catch (error) {
        // Fall back to default value or unknown
      }
    }

    return 'unknown';
  }
}
