import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting the entire directory tree of a specific folder
 * Uses Neo4j to get the complete tree of directories and files from a starting point
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting directory tree for folder', req.params);
  try {
    const { projectId, folderId } = req.params;

    // URL decode the folder path
    const folderPath = decodeURIComponent(folderId);

    logger.info(
      `Getting directory tree for folder ${folderPath} in project: ${projectId}`
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

    // Get the directory tree from Neo4j
    const tree = await neo4jService.getDirectoryTreeByPath(
      projectId,
      folderPath
    );

    // Return tree if found
    if (tree && tree.length > 0) {
      return res.status(200).json({
        success: true,
        data: tree,
      });
    }

    // No items found in the directory tree
    return res.status(404).json({
      success: false,
      message: `No items found in directory tree for folder ${folderPath} in project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting directory tree for folder:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting directory tree for folder: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
