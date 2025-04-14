import { Router } from 'express';
import logger from '@/utils/logger';
import filesRouter from './files';
import foldersRouter from './folders';
import itemsRouter from './items';
import gitRouter from './git';
import commandsRouter from './commands';

const router = Router({ mergeParams: true });

/**
 * Project-specific routes
 */
logger.debug('Initializing project-specific routes');

// Mount child routes
router.use('/files', filesRouter);
router.use('/folders', foldersRouter);
router.use('/items', itemsRouter);
router.use('/git', gitRouter);
router.use('/commands', commandsRouter);

export default router;
