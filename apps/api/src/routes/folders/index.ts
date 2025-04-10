import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { fileSystemService } from '@/services';
import folderPathStartRouter from './:folderPath/start';

const router = Router();

/**
 * Route handler for listing folders from USER_MOUNT environment variable
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userMount = process.env.USER_MOUNT;

    if (!userMount) {
      return res.status(500).json({
        success: false,
        message: 'USER_MOUNT environment variable is not defined',
      });
    }

    // Check if directory exists
    if (!fileSystemService.directoryExists(userMount)) {
      return res.status(404).json({
        success: false,
        message: `Directory specified in USER_MOUNT does not exist: ${userMount}`,
      });
    }

    // List all directories
    const folders = fileSystemService.listDirectories(userMount);

    return res.status(200).json({
      success: true,
      data: folders,
    });
  } catch (error) {
    logger.error('Error listing folders:', error);
    return res.status(500).json({
      success: false,
      message: `Error listing folders: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

// Mount nested route
router.use('/:folderPath/start', folderPathStartRouter);

export default router;
