import { Router, Request, Response } from 'express';
import { watcherManager } from '@/services';
import logger from '@/utils/logger';

const router = Router({ mergeParams: true });

/**
 * Route handler for restarting a file watcher process
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { processId } = req.params;

    logger.info(`Restarting watcher with process ID: ${processId}`);

    // Check if the process ID exists
    if (!watcherManager.getActiveWatcherIds().includes(processId)) {
      return res.status(400).json({
        success: false,
        message: `Process ID ${processId} not found`,
      });
    }

    // Restart the file watcher
    const restarted = await watcherManager.restartWatcher(processId);

    if (restarted) {
      return res.status(200).json({
        success: true,
        message: `Restarted file watcher with process ID: ${processId}`,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Failed to restart watcher: Process ID ${processId} not found`,
      });
    }
  } catch (error) {
    logger.error('Error restarting watcher:', error);
    return res.status(500).json({
      success: false,
      message: `Error restarting watcher: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
