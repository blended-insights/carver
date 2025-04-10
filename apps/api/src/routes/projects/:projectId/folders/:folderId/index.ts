import { Router } from 'express';
import getRouter from './get';
import filesRouter from './files';
import itemsRouter from './items';
import treeRouter from './tree';

const router = Router({ mergeParams: true });

// Mount child routes
router.use('/', getRouter);
router.use('/files', filesRouter);
router.use('/items', itemsRouter);
router.use('/tree', treeRouter);

export default router;
