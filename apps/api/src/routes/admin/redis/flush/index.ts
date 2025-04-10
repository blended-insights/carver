import { Router, Request, Response } from 'express';
import redisService from '@/core/database/redis';
import logger from '@/utils/logger';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    logger.info('Admin request: Flushing Redis');
    await redisService.flushAll();
    return res.json({ success: true, message: 'Redis data has been flushed' });
  } catch (error) {
    logger.error('Error flushing Redis:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to flush Redis',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
