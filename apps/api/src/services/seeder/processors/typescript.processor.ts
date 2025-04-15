import { FileNode } from '@/interfaces';
import { FileProcessor } from './base.processor';
import { neo4jService } from '@/services';
import logger from '@/utils/logger';

import {
  TsMorphProjectManager,
  VariableExtractor,
  FunctionExtractor,
  ClassExtractor,
  ImportExportExtractor,
} from './typescript';

/**
 * Processor for TypeScript/JavaScript files
 * Extracts code entities and stores them in Neo4j
 */
export class TypeScriptProcessor implements FileProcessor {
  /**
   * Check if the processor can handle the file
   * @param file The file to check
   * @returns Boolean indicating if this is a TypeScript/JavaScript file
   */
  canProcess(file: FileNode): boolean {
    const typescriptExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    return typescriptExtensions.includes(file.extension.toLowerCase());
  }

  /**
   * Process a TypeScript/JavaScript file
   * @param file The file to process
   * @param options Processing options
   * @returns Processing result
   */
  async processFile(
    file: FileNode,
    options: {
      projectName: string;
      changeType?: 'add' | 'change' | 'unlink';
    }
  ): Promise<{
    success: boolean;
    message: string;
    processedEntities?: {
      functions: number;
      classes: number;
      variables: number;
      imports: number;
      exports: number;
      functionCalls: number;
    };
  }> {
    try {
      // Initialize ts-morph project with just this file
      const project = TsMorphProjectManager.createProject([file]);
      const sourceFile = TsMorphProjectManager.getSourceFile(project, file);

      if (!sourceFile) {
        return {
          success: false,
          message: `Could not get source file for ${file.path}`,
        };
      }

      // Extract entities using our specialized extractors
      const functions = FunctionExtractor.extract(file, sourceFile);
      const classes = ClassExtractor.extract(file, sourceFile);
      const variables = VariableExtractor.extract(file, sourceFile);
      const imports = ImportExportExtractor.extractImports(file, sourceFile);
      const exports = ImportExportExtractor.extractExports(file, sourceFile);

      // First, handle deleted entities in the file (if the file already existed)
      await neo4jService.handleDeletedEntities(
        file.path,
        functions,
        classes
      );

      // Process entity movements (if they come from other files)
      await neo4jService.processEntityMovements(
        file.path,
        functions,
        classes
      );

      // Create entities in Neo4j
      for (const func of functions) {
        await neo4jService.createFunctionNode(func);
      }

      for (const cls of classes) {
        await neo4jService.createClassNode(cls);
      }

      for (const variable of variables) {
        await neo4jService.createVariableNode(variable);
      }

      for (const importNode of imports) {
        await neo4jService.createImportNode(importNode);
      }

      for (const exportNode of exports) {
        await neo4jService.createExportNode(exportNode);
      }

      // Process function calls
      const functionCalls = FunctionExtractor.analyzeCalls(
        functions,
        sourceFile
      );
      if (functionCalls.length > 0) {
        await neo4jService.createFunctionCallRelationships(
          file.path,
          functionCalls
        );
      }

      logger.debug(`Processed TypeScript file: ${file.path}`);

      return {
        success: true,
        message: `Successfully processed TypeScript file: ${file.path}`,
        processedEntities: {
          functions: functions.length,
          classes: classes.length,
          variables: variables.length,
          imports: imports.length,
          exports: exports.length,
          functionCalls: functionCalls.length,
        },
      };
    } catch (error) {
      logger.error(`Error processing TypeScript file ${file.path}:`, error);
      return {
        success: false,
        message: `Error processing TypeScript file ${file.path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
