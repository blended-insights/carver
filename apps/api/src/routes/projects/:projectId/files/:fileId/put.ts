import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService, queueService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for replacing text in a file
 * Uses queue system to handle high load and prevent race conditions
 */
router.put('/', async (req: Request, res: Response) => {
  logger.debug('Text replacement for file in project', req.params);
  try {
    const { projectId, fileId } = req.params;
    const { oldText, newText } = req.body;

    // Validate request body
    if (!oldText || !newText) {
      return res.status(400).json({
        success: false,
        message: 'Both oldText and newText are required',
      });
    }

    logger.info(
      `Queueing text replacement for file ${fileId} in project: ${projectId}`
    );

    // Get project path from Neo4j
    const project = await neo4jService.getProjectByName(projectId);
    const diskPath = project?.path;

    // Add file text replacement job to queue
    const job = await queueService.addFileJob(
      projectId,
      fileId,
      JSON.stringify({ oldText, newText }), // Pass oldText and newText for replacement
      diskPath,
      'replace' // Add a type parameter to indicate this is a replacement job
    );

    // Return acceptance with job ID for status tracking
    return res.status(202).json({
      success: true,
      message: `Text replacement for file ${fileId} queued for processing`,
      data: {
        jobId: job.id,
        path: fileId,
      },
    });
  } catch (error) {
    logger.error(`Error queueing text replacement:`, error);
    return res.status(500).json({
      success: false,
      message: `Error queueing text replacement: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
