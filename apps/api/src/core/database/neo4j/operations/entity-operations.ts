import { getNeo4jClient } from '../client';
import {
  ENTITY_QUERIES,
  ENTITY_DELETION_QUERIES,
  ENTITY_MOVEMENT_QUERIES,
  FUNCTION_CALL_QUERIES,
} from '@/constants/neo4j-queries';
import {
  FunctionNode,
  ClassNode,
  VariableNode,
  ImportNode,
  ExportNode,
} from '@/interfaces/services.interface';
import logger from '@/utils/logger';

/**
 * Operations for managing code entities in Neo4j
 */
export class EntityOperations {
  /**
   * Link a code entity to the current version
   * @param entityType Type of entity (Function, Class, Variable)
   * @param name Entity name
   * @param filePath File path
   * @param versionName Version name
   */
  async linkEntityToVersion(
    entityType: 'Function' | 'Class' | 'Variable',
    name: string,
    filePath: string,
    versionName: string
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        // Replace the template placeholder with the actual entity type
        const query = ENTITY_QUERIES.LINK_ENTITY_TO_VERSION.replace(
          '$ENTITY_TYPE',
          entityType
        );

        await session.run(query, {
          name,
          filePath,
          versionName,
        });
      } catch (error) {
        logger.error(`Error linking ${entityType} ${name} to version:`, error);
        throw error;
      }
    });
  }

  /**
   * Handle entities that were deleted from a file
   * @param filePath File path
   * @param currentFunctions Current functions in the file
   * @param currentClasses Current classes in the file
   * @param versionName Version name
   */
  async handleDeletedEntities(
    filePath: string,
    currentFunctions: FunctionNode[],
    currentClasses: ClassNode[],
    versionName: string
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        // Check if file already exists in database
        const fileExists = await session.run(
          ENTITY_DELETION_QUERIES.CHECK_FILE_EXISTS,
          { filePath }
        );

        if (fileExists.records.length === 0) {
          // New file, no deletions to handle
          return;
        }

        // Handle deleted functions
        const previousFunctions = await session.run(
          ENTITY_DELETION_QUERIES.GET_PREVIOUS_FUNCTIONS,
          { filePath }
        );

        const previousFunctionNames = previousFunctions.records.map((r) =>
          r.get('name')
        );
        const currentFunctionNames = currentFunctions.map((f) => f.name);

        const deletedFunctions = previousFunctionNames.filter(
          (name) => !currentFunctionNames.includes(name)
        );

        for (const funcName of deletedFunctions) {
          logger.debug(
            `Marking function as deleted: ${funcName} in ${filePath}`
          );

          await session.run(ENTITY_DELETION_QUERIES.MARK_FUNCTION_DELETED, {
            filePath,
            funcName,
            versionName,
          });
        }

        // Handle deleted classes
        const previousClasses = await session.run(
          ENTITY_DELETION_QUERIES.GET_PREVIOUS_CLASSES,
          { filePath }
        );

        const previousClassNames = previousClasses.records.map((r) =>
          r.get('name')
        );
        const currentClassNames = currentClasses.map((c) => c.name);

        const deletedClasses = previousClassNames.filter(
          (name) => !currentClassNames.includes(name)
        );

        for (const className of deletedClasses) {
          logger.debug(`Marking class as deleted: ${className} in ${filePath}`);

          await session.run(ENTITY_DELETION_QUERIES.MARK_CLASS_DELETED, {
            filePath,
            className,
            versionName,
          });
        }
      } catch (error) {
        logger.error(`Error handling deleted entities for ${filePath}:`, error);
        throw error;
      }
    });
  }

  /**
   * Process entities that may have moved from other files
   * @param filePath File path
   * @param functions Functions in the file
   * @param classes Classes in the file
   * @param versionName Version name
   */
  async processEntityMovements(
    filePath: string,
    functions: FunctionNode[],
    classes: ClassNode[],
    versionName: string
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        // Check for potentially moved functions
        for (const func of functions) {
          // Look for deleted functions with same name and parameters from other files
          const potentialMoves = await session.run(
            ENTITY_MOVEMENT_QUERIES.FIND_MOVED_FUNCTION,
            {
              funcName: func.name,
              filePath: filePath,
              parameters: func.parameters,
            }
          );

          if (potentialMoves.records.length > 0) {
            const oldPath = potentialMoves.records[0].get('oldPath');
            const funcNode = potentialMoves.records[0].get('func');

            logger.info(
              `Detected function movement: ${func.name} from ${oldPath} to ${filePath}`
            );

            // Mark as moved
            await session.run(ENTITY_MOVEMENT_QUERIES.MARK_FUNCTION_MOVED, {
              funcId: funcNode.identity,
              newPath: filePath,
              versionName,
            });
          }
        }

        // Check for potentially moved classes
        for (const cls of classes) {
          // Look for deleted classes with same name from other files
          const potentialMoves = await session.run(
            ENTITY_MOVEMENT_QUERIES.FIND_MOVED_CLASS,
            {
              className: cls.name,
              filePath: filePath,
            }
          );

          if (potentialMoves.records.length > 0) {
            const oldPath = potentialMoves.records[0].get('oldPath');
            const clsNode = potentialMoves.records[0].get('cls');

            logger.info(
              `Detected class movement: ${cls.name} from ${oldPath} to ${filePath}`
            );

            // Mark as moved
            await session.run(ENTITY_MOVEMENT_QUERIES.MARK_CLASS_MOVED, {
              clsId: clsNode.identity,
              newPath: filePath,
              versionName,
            });
          }
        }
      } catch (error) {
        logger.error(
          `Error processing entity movements for ${filePath}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Create a function node in Neo4j
   * @param func Function node data
   */
  async createFunctionNode(func: FunctionNode): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(ENTITY_QUERIES.CREATE_FUNCTION_NODE, {
          name: func.name,
          filePath: func.filePath,
          lineStart: func.lineStart,
          lineEnd: func.lineEnd,
          parameters: func.parameters,
        });
      } catch (error) {
        logger.error(`Error creating function node ${func.name}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create a class node in Neo4j
   * @param cls Class node data
   */
  async createClassNode(cls: ClassNode): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(ENTITY_QUERIES.CREATE_CLASS_NODE, {
          name: cls.name,
          filePath: cls.filePath,
          lineStart: cls.lineStart,
          lineEnd: cls.lineEnd,
          methods: cls.methods,
          properties: cls.properties,
        });
      } catch (error) {
        logger.error(`Error creating class node ${cls.name}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create a variable node in Neo4j
   * @param variable Variable node data
   */
  async createVariableNode(variable: VariableNode): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(ENTITY_QUERIES.CREATE_VARIABLE_NODE, {
          name: variable.name,
          filePath: variable.filePath,
          type: variable.type,
          line: variable.line,
        });
      } catch (error) {
        logger.error(`Error creating variable node ${variable.name}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create an import node in Neo4j
   * @param importNode Import node data
   */
  async createImportNode(importNode: ImportNode): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(ENTITY_QUERIES.CREATE_IMPORT_NODE, {
          source: importNode.source,
          filePath: importNode.filePath,
          line: importNode.line,
        });
      } catch (error) {
        logger.error(`Error creating import node ${importNode.source}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create an export node in Neo4j
   * @param exportNode Export node data
   */
  async createExportNode(exportNode: ExportNode): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(ENTITY_QUERIES.CREATE_EXPORT_NODE, {
          name: exportNode.name,
          filePath: exportNode.filePath,
          line: exportNode.line,
          isDefault: exportNode.isDefault,
        });
      } catch (error) {
        logger.error(`Error creating export node ${exportNode.name}:`, error);
        throw error;
      }
    });
  }

  /**
   * Create function call relationships in Neo4j
   * @param filePath File path
   * @param functionCalls Function calls data
   */
  async createFunctionCallRelationships(
    filePath: string,
    functionCalls: { caller: string; callee: string }[]
  ): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        // Create CALLS relationships
        for (const call of functionCalls) {
          await session.run(
            FUNCTION_CALL_QUERIES.CREATE_FUNCTION_CALL_RELATIONSHIP,
            {
              callerName: call.caller,
              calleeName: call.callee,
              filePath,
            }
          );
        }
      } catch (error) {
        logger.error(
          `Error creating function call relationships in ${filePath}:`,
          error
        );
        throw error;
      }
    });
  }
}

// Export singleton instance
export const entityOperations = new EntityOperations();
