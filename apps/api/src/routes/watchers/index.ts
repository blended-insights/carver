import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import processIdRouter from './:processId';
import { watcherManager } from '@/services';

const router = Router();

/**
 * Route handler for checking status of all file watcher processes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Getting status of all watchers');

    // Get all active watchers with details
    const watchers = watcherManager.getActiveWatchers();

    return res.status(200).json({ success: true, data: watchers });
  } catch (error) {
    logger.error('Error getting watcher status:', error);
    return res.status(500).json({
      success: false,
      message: `Error getting watcher status: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

// Mount processId route
router.use('/:processId', processIdRouter);

export default router;
