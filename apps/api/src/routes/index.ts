import { Router } from 'express';
import rootRouter from './root';
import adminRouter from './admin';
import foldersRouter from './folders';
import projectRouter from './projects';
import watchersRouter from './watchers';
import { requestLoggerMiddleware } from '@/utils/request-logger';

const router = Router();

// Apply the logger middleware to all routes
router.use(requestLoggerMiddleware);

// Mount top-level routes
router.use('/', rootRouter);
router.use('/admin', adminRouter);
router.use('/folders', foldersRouter);
router.use('/projects', projectRouter);
router.use('/watchers', watchersRouter);

export default router;
