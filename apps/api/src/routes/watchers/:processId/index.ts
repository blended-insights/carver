import { Router, Request, Response } from 'express';
import { watcherManager } from '@/services';
import logger from '@/utils/logger';
import killRouter from './kill';
import restartRouter from './restart';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting information about a specific watcher process
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { processId } = req.params;

    logger.info(`Getting details for watcher process ID: ${processId}`);

    // Get all active watchers
    const watcher = watcherManager.getActiveWatcherById(processId);

    if (!watcher) {
      return res.status(404).json({
        success: false,
        message: `Watcher with process ID ${processId} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: watcher,
    });
  } catch (error) {
    logger.error('Error getting watcher details:', error);
    return res.status(500).json({
      success: false,
      message: `Error getting watcher details: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

// Mount nested routes
router.use('/kill', killRouter);
router.use('/restart', restartRouter);

export default router;
