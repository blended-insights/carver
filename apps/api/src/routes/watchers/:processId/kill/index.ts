import { Router, Request, Response } from 'express';
import { watcherManager } from '@/services';
import logger from '@/utils/logger';

const router = Router({ mergeParams: true });

/**
 * Route handler for killing a file watcher process
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { processId } = req.params;

    logger.info(`Killing watcher with process ID: ${processId}`);

    // Check if the process ID exists
    if (!watcherManager.getActiveWatcherIds().includes(processId)) {
      return res.status(400).json({
        success: false,
        message: `Process ID ${processId} not found`,
      });
    }

    // Kill the file watcher
    const killed = await watcherManager.killWatcher(processId);

    if (killed) {
      return res.status(200).json({
        success: true,
        message: `Killed file watcher with process ID: ${processId}`,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Failed to kill watcher: Process ID ${processId} not found`,
      });
    }
  } catch (error) {
    logger.error('Error killing watcher:', error);
    return res.status(500).json({
      success: false,
      message: `Error killing watcher: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
