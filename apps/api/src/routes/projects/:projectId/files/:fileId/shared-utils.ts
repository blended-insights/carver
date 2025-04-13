import { fileSystemService, queueService, redisService } from '@/services';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';
import { Response } from 'express';
import ts from 'typescript';

const { USER_MOUNT } = process.env;

export function isValidScript(
  code: string,
  fileName: string
): { valid: boolean; errors?: string[] } {
  const ext = fileName.split('.').pop()?.toLowerCase();

  // Check if the file extension is not one of the supported types
  // If not, return valid without further checks
  if (!ext || !['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    return { valid: true };
  }

  const { diagnostics } = ts.transpileModule(code, {
    compilerOptions: {
      allowJs: true,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ESNext,
    },
    fileName,
    reportDiagnostics: true,
    transformers: undefined,
  });

  if (!diagnostics || diagnostics.length === 0) {
    return { valid: true };
  }

  const errors = diagnostics.map((d) => {
    const { line, character } = d.file
      ? d.file.getLineAndCharacterOfPosition(d.start ?? 0)
      : { line: 0, character: 0 };

    const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    return `Line ${line + 1}, Col ${character + 1}: ${message}`;
  });

  return { valid: false, errors };
}

/**
 * Ensures a file is available in Redis, loading from disk if needed
 * @param projectId Project identifier
 * @param fileId File identifier
 * @returns Object containing success status, file content and hash if successful
 */
export async function ensureFileInRedis(
  projectId: string,
  fileId: string
): Promise<{
  success: boolean;
  message?: string;
  content?: string;
  hash?: string;
}> {
  try {
    // Try to get file from Redis first
    let fileData = await redisService.getProjectFile(projectId, fileId);

    // If file already in Redis, return it
    if (fileData && fileData.content) {
      return {
        success: true,
        content: fileData.content,
        hash: fileData.hash,
      };
    }

    // File not in Redis, try to load from disk
    logger.warn(`File ${fileId} not found in Redis for project ${projectId}`);

    // Get project path from Neo4j
    if (!USER_MOUNT) {
      return {
        success: false,
        message: `User mount not configured. Cannot load file ${fileId} from disk.`,
      };
    }

    // Check if file exists on disk
    const filePath = buildProjectPath(projectId, fileId);
    if (!fileSystemService.fileExists(filePath)) {
      return {
        success: false,
        message: `File ${fileId} not found on disk or in Redis`,
      };
    }

    // Read file content from disk
    const fileContent = fileSystemService.readFileContent(filePath);
    if (!fileContent) {
      return {
        success: false,
        message: `Could not read file ${fileId} from disk`,
      };
    }

    // Calculate hash and store in Redis
    const hash = fileSystemService.calculateHash(fileContent);
    await redisService.storeFileData(projectId, fileId, fileContent, hash);

    // Verify file is now in Redis
    fileData = await redisService.getProjectFile(projectId, fileId);
    if (!fileData || !fileData.content) {
      return {
        success: false,
        message: `Failed to retrieve file ${fileId} after storing it in Redis`,
      };
    }

    logger.info(
      `Successfully loaded file ${fileId} from disk into Redis for project ${projectId}`
    );

    return {
      success: true,
      content: fileData.content,
      hash: fileData.hash,
    };
  } catch (error) {
    logger.error(`Error ensuring file in Redis: ${projectId}/${fileId}`, error);
    return {
      success: false,
      message: `Error loading file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Updates file content in Redis and queues a write job for disk persistence
 * @param res Express response object
 * @param projectId Project identifier
 * @param fileId File identifier
 * @param content Updated file content
 * @param operation Type of operation performed
 * @param additionalData Additional data for response
 * @returns Express response
 */
export async function updateFileAndQueueWrite(
  res: Response,
  projectId: string,
  fileId: string,
  content: string,
  operation = 'update',
  additionalData: Record<string, unknown> = {}
): Promise<Response> {
  try {
    // Calculate hash for updated content
    const hash = fileSystemService.calculateHash(content);

    // Store updated content in Redis
    await redisService.storeFileData(projectId, fileId, content, hash);

    logger.info(
      `Successfully updated file ${fileId} in Redis for project ${projectId}`
    );

    if (!USER_MOUNT) {
      return res.status(404).json({
        success: false,
        message: `Project ${projectId} not found`,
      });
    }

    // Add file content update job to queue
    const job = await queueService.addFileJob(
      projectId,
      fileId,
      content,
      buildProjectPath(projectId)
    );

    // Prepare response message
    const message = `File ${fileId} ${operation} completed successfully`;

    return res.status(200).json({
      success: true,
      message,
      data: {
        jobId: job.id,
        path: fileId,
        hash,
        lastModified: Date.now().toString(),
        ...additionalData,
      },
    });
  } catch (error) {
    logger.error(`Error updating file and queueing write:`, error);
    return res.status(500).json({
      success: false,
      message: `Error updating file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}
