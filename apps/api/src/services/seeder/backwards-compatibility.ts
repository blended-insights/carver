/**
 * This file provides backward compatibility with the original ts-morph-extractors.ts
 * It adapts the new modular extractors to the original function signatures
 */
import { Project, SourceFile } from 'ts-morph';
import {
  FileNode,
  FunctionNode,
  VariableNode,
  ClassNode,
  ImportNode,
  ExportNode,
} from '@/interfaces';

import {
  TsMorphProjectManager,
  VariableExtractor,
  FunctionExtractor,
  ClassExtractor,
  ImportExportExtractor,
} from './processors/typescript';

/**
 * Adapts the new TsMorphProjectManager.createProject to the original createTsMorphProject
 */
export function createTsMorphProject(fileNodes: FileNode[]): Project {
  return TsMorphProjectManager.createProject(fileNodes);
}

/**
 * Adapts the new TsMorphProjectManager.getSourceFile to the original getSourceFile
 */
export function getSourceFile(
  project: Project,
  fileNode: FileNode
): SourceFile | undefined {
  return TsMorphProjectManager.getSourceFile(project, fileNode);
}

/**
 * Adapts the new VariableExtractor.extract to the original extractVariables
 */
export function extractVariables(
  file: FileNode,
  sourceFile: SourceFile
): VariableNode[] {
  return VariableExtractor.extract(file, sourceFile);
}

/**
 * Adapts the new FunctionExtractor.extract to the original extractFunctions
 */
export function extractFunctions(
  file: FileNode,
  sourceFile: SourceFile
): FunctionNode[] {
  return FunctionExtractor.extract(file, sourceFile);
}

/**
 * Adapts the new ClassExtractor.extract to the original extractClasses
 */
export function extractClasses(
  file: FileNode,
  sourceFile: SourceFile
): ClassNode[] {
  return ClassExtractor.extract(file, sourceFile);
}

/**
 * Adapts the new ImportExportExtractor.extractImports to the original extractImports
 */
export function extractImports(
  file: FileNode,
  sourceFile: SourceFile
): ImportNode[] {
  return ImportExportExtractor.extractImports(file, sourceFile);
}

/**
 * Adapts the new ImportExportExtractor.extractExports to the original extractExports
 */
export function extractExports(
  file: FileNode,
  sourceFile: SourceFile
): ExportNode[] {
  return ImportExportExtractor.extractExports(file, sourceFile);
}

/**
 * Adapts the new FunctionExtractor.analyzeCalls to the original analyzeFunctionCalls
 */
export function analyzeFunctionCalls(
  functions: FunctionNode[],
  sourceFile: SourceFile
): { caller: string; callee: string }[] {
  return FunctionExtractor.analyzeCalls(functions, sourceFile);
}
