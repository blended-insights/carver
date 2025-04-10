import { Router } from 'express';
import redisRouter from './redis';
import neo4jRouter from './neo4j';

const router = Router();

// Mount the admin routes
router.use('/redis', redisRouter);
router.use('/neo4j', neo4jRouter);

export default router;
