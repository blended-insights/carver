import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting all items (directories and files) at the root level of a project
 * Uses Neo4j to get both directories and files at the root level of a project
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting root items for project', req.params);
  try {
    const { projectId } = req.params;
    
    logger.info(`Getting root items for project: ${projectId}`);

    // Get both directories and files at root level from Neo4j
    const items = await neo4jService.getRootItemsByProject(projectId);

    // Return items if found
    if (items && items.length > 0) {
      return res.status(200).json({
        success: true,
        data: items,
      });
    }

    // No items found in the project
    return res.status(404).json({
      success: false,
      message: `No items found in project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting root items for project:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting root items for project: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
