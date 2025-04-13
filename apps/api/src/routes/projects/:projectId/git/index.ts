import { Router } from 'express';
import logger from '@/utils/logger';
import statusRouter from './status';
import branchesRouter from './branches';
import commitsRouter from './commits';
import diffRouter from './diff';
import logsRouter from './logs';
import addRouter from './add';
import resetRouter from './reset';

const router = Router({ mergeParams: true });

/**
 * Git-related routes for a project
 */
logger.debug('Initializing git-related routes');

// Mount child routes
router.use('/status', statusRouter);
router.use('/branches', branchesRouter);
router.use('/commits', commitsRouter);
router.use('/diff', diffRouter);
router.use('/logs', logsRouter);
router.use('/add', addRouter);
router.use('/reset', resetRouter);

export default router;
