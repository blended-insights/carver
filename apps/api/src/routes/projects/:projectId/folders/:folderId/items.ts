import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting all items (directories and files) in a specific folder
 * Uses Neo4j to get both directories and files contained in a directory
 *
 * Fixed GET_ITEMS_BY_DIRECTORY query to correctly handle files and directories
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting items in folder for project', req.params);
  try {
    const { projectId, folderId } = req.params;

    // URL decode the folder path
    const folderPath = decodeURIComponent(folderId);

    logger.info(
      `Getting items in folder ${folderPath} for project: ${projectId}`
    );

    // First check if the directory exists
    const folderExists = await neo4jService.getDirectoryByPath(
      projectId,
      folderPath
    );

    if (!folderExists) {
      return res.status(404).json({
        success: false,
        message: `Folder ${folderPath} not found in project: ${projectId}`,
      });
    }

    const items = await neo4jService.getItemsByDirectory(projectId, folderPath);

    // Return items if found
    if (items && items.length > 0) {
      return res.status(200).json({
        success: true,
        data: items,
      });
    }

    // No items found in the directory
    return res.status(404).json({
      success: false,
      message: `No items found in folder ${folderPath} for project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting items in folder for project:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting items in project folder: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
