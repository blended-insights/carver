import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting files in a specific folder (directory) from a project
 * Uses Neo4j to get files contained in a directory
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting files in folder for project', req.params);
  try {
    const { projectId, folderId } = req.params;

    // URL decode the folder path
    const folderPath = decodeURIComponent(folderId);
    
    logger.info(`Getting files in folder ${folderPath} for project: ${projectId}`);

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

    // Get files in the directory from Neo4j
    const files = await neo4jService.getFilesByDirectory(
      projectId,
      folderPath
    );

    // Return files if found
    if (files && files.length > 0) {
      return res.status(200).json({
        success: true,
        data: files,
      });
    }

    // No files found in the directory
    return res.status(404).json({
      success: false,
      message: `No files found in folder ${folderPath} for project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting files in folder for project:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting files in project folder: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
