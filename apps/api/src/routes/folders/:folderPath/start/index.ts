import { Router, Request, Response } from 'express';
import { fileSystemService, watcherManager } from '@/services';
import logger from '@/utils/logger';

const router = Router({ mergeParams: true });

/**
 * Route handler for starting a file watcher process
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { folderPath } = req.params;

    // Validate folder exists
    if (!fileSystemService.directoryExists(folderPath)) {
      return res.status(400).json({
        success: false,
        message: `Directory does not exist: ${folderPath}`,
      });
    }

    // Check if a watcher already exists for this folder path
    const activeWatchers = watcherManager.getActiveWatchers();
    const existingWatcher = activeWatchers.find(
      (watcher) => watcher.folderPath === folderPath
    );

    if (existingWatcher) {
      logger.warn(
        `Watcher already exists for folder: ${folderPath} with process ID: ${existingWatcher.processId}`
      );
      return res.status(409).json({
        success: false,
        message: `Watcher already exists for folder: ${folderPath} with process ID: ${existingWatcher.processId}`,
        processId: existingWatcher.processId,
      });
    }

    // Use provided project name or derive from folder path
    const project =
      req.query.project?.toString() ||
      folderPath.split('/').pop() ||
      'unnamed-project';

    logger.info(
      `Starting watcher for folder: ${folderPath} with project name: ${project}`
    );

    // Start the file watcher
    const processId = await watcherManager.startWatcher(folderPath, project);

    return res.status(200).json({
      success: true,
      processId,
      message: `Started file watcher for ${folderPath} with process ID: ${processId}`,
    });
  } catch (error) {
    logger.error('Error starting watcher:', error);
    return res.status(500).json({
      success: false,
      message: `Error starting watcher: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
