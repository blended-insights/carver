import { Router } from 'express';
import clearRouter from './clear';

const router = Router();

// Mount nested route
router.use('/clear', clearRouter);

export default router;
