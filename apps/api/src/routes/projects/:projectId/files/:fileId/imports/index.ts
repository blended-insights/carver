import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';
import { FILE_IMPORT_QUERIES } from '@/constants/neo4j-queries';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting imports for a specific file from a project
 * Uses Neo4j to query for import relationships
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting imports for file', req.params);
  try {
    const { projectId, fileId } = req.params;

    logger.info(`Getting imports for file ${fileId} in project: ${projectId}`);

    // Get file imports from Neo4j
    const importResults = await neo4jService.executeQuery(
      FILE_IMPORT_QUERIES.GET_FILE_IMPORTS,
      { filePath: fileId }
    );

    // Extract import sources from results
    const imports = importResults.map((result) => result.importSource);

    // Return imports data formatted according to FileImports interface
    return res.status(200).json({
      success: true,
      data: imports,
    });
  } catch (error) {
    logger.error(`Error getting imports for file:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting file imports: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
