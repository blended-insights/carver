import { Router, Request, Response } from 'express';
import { neo4jService } from '@/core/database/neo4j';
import logger from '@/utils/logger';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    logger.info('Admin request: Clearing Neo4j database');
    
    // Using the refactored Neo4j service 
    // The API remains the same, but now it's using our modular implementation
    await neo4jService.clearDatabase();

    // Re-create constraints and indexes after clearing database
    await neo4jService.createConstraintsAndIndexes();

    return res.json({
      success: true,
      message: 'Neo4j database has been cleared and constraints recreated',
    });
  } catch (error) {
    logger.error('Error clearing Neo4j database:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear Neo4j database',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
