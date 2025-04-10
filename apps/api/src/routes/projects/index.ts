import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/core/database/neo4j';
import projectIdRouter from './:projectId';

const router = Router();

/**
 * Get all projects from Neo4j database
 * GET /projects
 * Returns a list of projects with their metadata
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting all projects');
  try {
    // Get projects using the dedicated service method
    const projects = await neo4jService.getAllProjects();

    // Format the response
    return res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    logger.error('Error getting projects:', error);
    return res.status(500).json({
      success: false,
      message: `Error getting projects: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

// Mount the project ID routes
router.use('/:projectId', projectIdRouter);

export default router;
