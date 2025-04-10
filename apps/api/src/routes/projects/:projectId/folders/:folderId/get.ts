import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting a specific folder (directory) from a project
 * Uses Neo4j to get a directory by path
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting folder for project', req.params);
  try {
    const { projectId, folderId } = req.params;

    // URL decode the folder path
    const folderPath = decodeURIComponent(folderId);
    
    logger.info(`Getting folder ${folderPath} for project: ${projectId}`);

    // Get folder data from Neo4j
    const folderData = await neo4jService.getDirectoryByPath(
      projectId,
      folderPath
    );

    // Return folder data if found
    if (folderData) {
      return res.status(200).json({
        success: true,
        data: folderData,
      });
    }

    // Folder not found
    return res.status(404).json({
      success: false,
      message: `Folder ${folderPath} not found in project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting folder for project:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting project folder: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
