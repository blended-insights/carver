import { Router } from 'express';
import flushRouter from './flush';

const router = Router();

// Mount nested route
router.use('/flush', flushRouter);

export default router;
