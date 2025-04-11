import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService, queueService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for creating a folder in a project
 * Uses queue system to handle folder creation, supporting recursive path creation
 * 
 * POST /projects/:projectId/folders
 * Request body:
 * - folderPath: String representing the folder path to create (relative to project root)
 */
router.post('/', async (req: Request, res: Response) => {
  logger.debug('Creating folder for project', req.params);
  try {
    const { projectId } = req.params;
    const { folderPath } = req.body;

    // Validate request body
    if (!folderPath) {
      return res.status(400).json({
        success: false,
        message: 'Folder path is required',
      });
    }

    logger.info(
      `Queueing folder "${folderPath}" for creation in project: ${projectId}`
    );

    // Get project path from Neo4j
    const project = await neo4jService.getProjectByName(projectId);
    const diskPath = project?.path;

    if (!diskPath) {
      return res.status(404).json({
        success: false,
        message: `Project ${projectId} not found or has no disk path`,
      });
    }

    // Add folder processing job to queue
    const job = await queueService.addFolderJob(
      projectId,
      folderPath,
      diskPath
    );

    // Return acceptance with job ID for status tracking
    return res.status(202).json({
      success: true,
      message: `Folder "${folderPath}" queued for creation`,
      data: {
        jobId: job.id,
        path: folderPath,
      },
    });
  } catch (error) {
    logger.error(`Error queueing folder for creation:`, error);
    return res.status(500).json({
      success: false,
      message: `Error queueing folder for creation: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

/**
 * Route handler for checking the status of a folder processing job
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