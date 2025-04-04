// Export everything from seeder
export type * from './types';

import path from 'path';
import logger from '@/utils/logger';

// Import services
import { neo4jService, redisService, fileSystemService } from '@/services';

// Import seeder modules
import { type FileNode } from './types';

import {
  createTsMorphProject,
  getSourceFile,
  extractFunctions,
  extractClasses,
  extractVariables,
  extractImports,
  extractExports,
  analyzeFunctionCalls,
} from './ts-morph-extractors';
import { processDirectory } from './file-processing';

/**
 * Seeds the Neo4j database with version-tracked code entities using ts-morph and Redis
 */
export async function seedGraphForFolder(options: {
  root: string;
  project: string;
}): Promise<{ success: boolean; message: string }> {
  // Destructure options
  const { root, project } = options;

  // Validate inputs
  if (!root || !project) {
    return {
      success: false,
      message: 'Missing required parameters: root path and project name',
    };
  }

  // Resolve the root path
  const rootPath = path.resolve(root);
  const projectName = project;
  const versionName = `v_${Date.now()}`;

  // Validate that the directory exists
  if (!fileSystemService.directoryExists(rootPath)) {
    return {
      success: false,
      message: `Directory does not exist: ${rootPath}`,
    };
  }

  const session = neo4jService.getSession();
  try {
    // Create unique constraints and indexes
    await neo4jService.createConstraintsAndIndexes(session);

    // Create or get Project node
    await neo4jService.createOrGetProject(session, projectName, rootPath);

    // Create new Version node
    await neo4jService.createVersion(session, versionName, projectName);

    // Process the file structure (directories and files)
    await processDirectory(session, rootPath, rootPath, projectName);

    // Get all files from disk
    const filesFromDisk = fileSystemService.getAllFilesFromDisk(rootPath);
    logger.info(`Found ${filesFromDisk.length} files on disk`);

    // Get all existing file keys from Redis for this project
    const redisFileKeys = await redisService.getProjectFileKeys(projectName);
    const diskFilePaths = filesFromDisk.map(
      (f) => `project:${projectName}:file:${f.relativePath}`
    );

    // Find deleted files (in Redis but not on disk)
    const deletedFilePaths = redisFileKeys.filter(
      (key) => !diskFilePaths.includes(key)
    );

    // Process deleted files
    for (const deletedFilePath of deletedFilePaths) {
      const filePath = deletedFilePath.replace(
        `project:${projectName}:file:`,
        ''
      );
      logger.info(`Marking file as deleted: ${filePath}`);

      // Mark file as deleted in current version
      await neo4jService.markFileAsDeleted(session, filePath, versionName);

      // Remove from Redis
      await redisService.deleteFileData(projectName, filePath);
    }

    // Process files to find changes
    const newOrChangedFiles: FileNode[] = [];
    const unchangedFiles: string[] = [];

    for (const file of filesFromDisk) {
      const currentHash = fileSystemService.calculateHash(file.content);

      // Get stored hash from Redis
      const storedHash = await redisService.getFileHash(
        projectName,
        file.relativePath
      );

      if (!storedHash || storedHash !== currentHash) {
        // File is new or changed
        newOrChangedFiles.push(fileSystemService.convertToFileNode(file));

        // Update Redis
        await redisService.storeFileData(
          projectName,
          file.relativePath,
          file.content,
          currentHash
        );
      } else {
        // File is unchanged
        unchangedFiles.push(file.relativePath);
      }
    }

    logger.info(`Found ${newOrChangedFiles.length} new or changed files`);
    logger.info(`Found ${unchangedFiles.length} unchanged files`);

    // Filter for TypeScript/JavaScript files
    const tsJsFiles =
      fileSystemService.filterTypeScriptFiles(newOrChangedFiles);

    // Skip files that are too large
    const filteredFiles = fileSystemService.filterLargeFiles(tsJsFiles);

    logger.info(
      `Processing ${filteredFiles.length} TypeScript/JavaScript files with ts-morph`
    );

    // Process changed/new files with ts-morph
    if (filteredFiles.length > 0) {
      // Initialize ts-morph project
      const project = createTsMorphProject(filteredFiles);

      // Process each file
      for (const file of filteredFiles) {
        try {
          const sourceFile = getSourceFile(project, file);
          if (!sourceFile) {
            logger.warn(`Could not get source file for ${file.path}`);
            continue;
          }

          // Extract entities using ts-morph
          const functions = extractFunctions(file, sourceFile);
          const classes = extractClasses(file, sourceFile);
          const variables = extractVariables(file, sourceFile);
          const imports = extractImports(file, sourceFile);
          const exports = extractExports(file, sourceFile);

          // First, handle deleted entities in the file (if the file already existed)
          await neo4jService.handleDeletedEntities(
            session,
            file.path,
            functions,
            classes,
            versionName
          );

          // Process entity movements (if they come from other files)
          await neo4jService.processEntityMovements(
            session,
            file.path,
            functions,
            classes,
            versionName
          );

          // Create file's relationship to current version
          await neo4jService.createFileVersionRelationship(
            session,
            file.path,
            versionName
          );

          // Create entities in Neo4j
          for (const func of functions) {
            await neo4jService.createFunctionNode(session, func);
            await neo4jService.linkEntityToVersion(
              session,
              'Function',
              func.name,
              func.filePath,
              versionName
            );
          }

          for (const cls of classes) {
            await neo4jService.createClassNode(session, cls);
            await neo4jService.linkEntityToVersion(
              session,
              'Class',
              cls.name,
              cls.filePath,
              versionName
            );
          }

          for (const variable of variables) {
            await neo4jService.createVariableNode(session, variable);
            await neo4jService.linkEntityToVersion(
              session,
              'Variable',
              variable.name,
              variable.filePath,
              versionName
            );
          }

          for (const importNode of imports) {
            await neo4jService.createImportNode(session, importNode);
          }

          for (const exportNode of exports) {
            await neo4jService.createExportNode(session, exportNode);
          }

          // Process function calls
          const functionCalls = analyzeFunctionCalls(functions, sourceFile);
          if (functionCalls.length > 0) {
            await neo4jService.createFunctionCallRelationships(
              session,
              file.path,
              functionCalls
            );
          }

          logger.debug(`Processed file: ${file.path}`);
        } catch (error) {
          logger.error(`Error processing file ${file.path}:`, error);
        }
      }
    }

    logger.info(
      `Successfully seeded the graph database for project: ${projectName} with version: ${versionName}`
    );

    return {
      success: true,
      message: `Successfully seeded the graph database for project: ${projectName} with version: ${versionName}. Processed ${filesFromDisk.length} files (${newOrChangedFiles.length} changed, ${filteredFiles.length} analyzed)`,
    };
  } catch (error) {
    logger.error('Error seeding graph database:', error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  } finally {
    await session.close();
  }
}
