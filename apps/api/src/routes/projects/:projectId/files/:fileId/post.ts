import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService, redisService, queueService, fileSystemService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for creating/updating a file in a project
 * Uses queue system to handle high load and prevent race conditions
 */
router.post('/', async (req: Request, res: Response) => {
  logger.debug('Creating/updating file for project', req.params);
  try {
    const { projectId, fileId } = req.params;
    const { content } = req.body;

    // Validate request body
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'File content is required',
      });
    }

    logger.info(
      `Processing file ${fileId} for creation/update in project: ${projectId}`
    );

    // Get project path from Neo4j
    const project = await neo4jService.getProjectByName(projectId);

    if (!project || !project.path) {
      return res.status(404).json({
        success: false,
        message: `Project ${projectId} not found`,
      });
    }

    const diskPath = project.path;

    // Calculate hash for the file content
    const hash = fileSystemService.calculateHash(content);

    // First store the file data in Redis 
    logger.debug(`Storing file data in Redis for ${fileId} in project ${projectId}`);
    await redisService.storeFileData(projectId, fileId, content, hash);

    // Add file processing job to queue
    const job = await queueService.addFileJob(
      projectId,
      fileId,
      content,
      diskPath
    );

    // Return acceptance with job ID for status tracking
    return res.status(202).json({
      success: true,
      message: `File ${fileId} queued for processing`,
      data: {
        jobId: job.id,
        path: fileId,
      },
    });
  } catch (error) {
    logger.error(`Error creating/updating file:`, error);
    return res.status(500).json({
      success: false,
      message: `Error creating/updating file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

/**
 * Route handler for checking the status of a file processing job
 */
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Get the job from the queue
    const job = await queueService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job ${jobId} not found`,
      });
    }

    // Get the current state of the job
    const state = await job.getState();

    return res.status(200).json({
      success: true,
      data: {
        id: job.id,
        state,
        result: job.returnvalue || null,
        reason: job.failedReason || null,
        progress: job.progress || 0,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      },
    });
  } catch (error) {
    logger.error(`Error getting job status:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting job status: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
