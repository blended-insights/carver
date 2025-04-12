import { Router } from 'express';
import importsRouter from './imports';
import getRouter from './get';
import patchRouter from './patch';
import postRouter from './post';
import putRouter from './put';

const router = Router({ mergeParams: true });

// Mount child routes
router.use('/', getRouter);
router.use('/', patchRouter);
router.use('/', postRouter);
router.use('/', putRouter);

router.use('/imports', importsRouter);

export default router;
