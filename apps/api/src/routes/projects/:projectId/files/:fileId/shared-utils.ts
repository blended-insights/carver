import {
  fileSystemService,
  neo4jService,
  queueService,
  redisService,
} from '@/services';
import logger from '@/utils/logger';
import { Response } from 'express';
import path from 'path';

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
    const project = await neo4jService.getProjectByName(projectId);
    if (!project || !project.path) {
      return {
        success: false,
        message: `Project ${projectId} not found`,
      };
    }

    // Check if file exists on disk
    const filePath = path.join(project.path, fileId);
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

    // Get project path from Neo4j for the queue job
    const project = await neo4jService.getProjectByName(projectId);
    
    if (!project || !project.path) {
      return res.status(404).json({
        success: false,
        message: `Project ${projectId} not found`,
      });
    }
    
    // Get disk path for the project
    const diskPath = project.path;

    // Add file content update job to queue
    const job = await queueService.addFileJob(
      projectId,
      fileId,
      content,
      diskPath,
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
