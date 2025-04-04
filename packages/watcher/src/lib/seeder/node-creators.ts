import * as neo4j from "neo4j-driver";
import type { ImportNode, ExportNode, FunctionNode, ClassNode, VariableNode } from "@carver/shared";

/**
 * Creates an Import node and relationships
 */
export async function createImportNode(
  session: neo4j.Session,
  importNode: ImportNode,
): Promise<void> {
  await session.run(
    `
    MATCH (f:File {path: $filePath})
    MERGE (i:Import {source: $source, line: $line, filePath: $filePath})
    MERGE (f)-[:DEFINES]->(i)
    `,
    {
      filePath: importNode.filePath,
      source: importNode.source,
      line: importNode.line,
    },
  );
}

/**
 * Creates an Export node and relationships
 */
export async function createExportNode(
  session: neo4j.Session,
  exportNode: ExportNode,
): Promise<void> {
  await session.run(
    `
    MATCH (f:File {path: $filePath})
    MERGE (e:Export {
      name: $name, 
      line: $line, 
      filePath: $filePath,
      isDefault: $isDefault
    })
    MERGE (f)-[:DEFINES]->(e)
    `,
    {
      filePath: exportNode.filePath,
      name: exportNode.name,
      line: exportNode.line,
      isDefault: exportNode.isDefault,
    },
  );
}

/**
 * Creates a Function node and relationships
 */
export async function createFunctionNode(
  session: neo4j.Session,
  functionNode: FunctionNode,
): Promise<void> {
  await session.run(
    `
    MATCH (f:File {path: $filePath})
    MERGE (func:Function {
      name: $name, 
      filePath: $filePath,
      lineStart: $lineStart,
      lineEnd: $lineEnd,
      parameters: $parameters
    })
    MERGE (f)-[:DEFINES]->(func)
    `,
    {
      filePath: functionNode.filePath,
      name: functionNode.name,
      lineStart: functionNode.lineStart,
      lineEnd: functionNode.lineEnd,
      parameters: functionNode.parameters,
    },
  );
}

/**
 * Creates a Class node and relationships
 */
export async function createClassNode(session: neo4j.Session, classNode: ClassNode): Promise<void> {
  await session.run(
    `
    MATCH (f:File {path: $filePath})
    MERGE (c:Class {
      name: $name, 
      filePath: $filePath,
      lineStart: $lineStart,
      lineEnd: $lineEnd,
      methods: $methods,
      properties: $properties
    })
    MERGE (f)-[:DEFINES]->(c)
    `,
    {
      filePath: classNode.filePath,
      name: classNode.name,
      lineStart: classNode.lineStart,
      lineEnd: classNode.lineEnd,
      methods: classNode.methods,
      properties: classNode.properties,
    },
  );
}

/**
 * Creates a Variable node and relationships
 */
export async function createVariableNode(
  session: neo4j.Session,
  variableNode: VariableNode,
): Promise<void> {
  await session.run(
    `
    MATCH (f:File {path: $filePath})
    MERGE (v:Variable {
      name: $name, 
      filePath: $filePath,
      type: $type,
      line: $line
    })
    MERGE (f)-[:DEFINES]->(v)
    `,
    {
      filePath: variableNode.filePath,
      name: variableNode.name,
      type: variableNode.type,
      line: variableNode.line,
    },
  );
}

/**
 * Creates function call relationships
 */
export async function createFunctionCallRelationships(
  session: neo4j.Session,
  filePath: string,
  functionCalls: { caller: string; callee: string }[],
): Promise<void> {
  for (const call of functionCalls) {
    await session.run(
      `
      MERGE (caller:Function {name: $callerName, filePath: $filePath})
      MERGE (callee:Function {name: $calleeName, filePath: $filePath})
      MERGE (caller)-[:CALLS]->(callee)
      `,
      {
        callerName: call.caller,
        calleeName: call.callee,
        filePath: filePath,
      },
    );
  }
}
