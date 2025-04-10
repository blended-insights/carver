import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { redisService, neo4jService } from '@/services';
import fileIdRouter from './:fileId';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting files for a specific project
 *
 * Endpoints:
 * - GET /: Get all files for a project, supports search functionality via query parameters
 * - GET /?search=term: Search files by the given term
 * - GET /?search=term&type=function: Search files by functions that match the term
 * - GET /?search=term&type=import: Search files by imports that match the term
 * - GET /?search=term&type=directory: Search files by directory paths that match the term
 *
 * Uses Redis for basic file listing and Neo4j for advanced search capabilities.
 * This makes the endpoint REST compliant by supporting search as a query parameter
 * rather than a separate endpoint.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const searchTerm = req.query.search as string | undefined;
    const searchType = req.query.type as string | undefined;

    logger.info(
      `Getting files for project: ${projectId}${
        searchTerm ? ` with search term: ${searchTerm}` : ''
      }`
    );

    // If search term is provided, use search functionality
    if (searchTerm && searchTerm.trim().length > 0) {
      // Validate search term has minimum length
      if (searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 2 characters',
        });
      }

      // Determine search strategy based on searchType parameter
      if (searchType) {
        let files = [];

        switch (searchType) {
          case 'function':
            // Search for files that define functions matching the search term
            files = await neo4jService.searchFilesByFunction(
              projectId,
              searchTerm
            );
            break;

          case 'import':
            // Search for files that import modules matching the search term
            files = await neo4jService.searchFilesByImport(
              projectId,
              searchTerm
            );
            break;

          case 'directory':
            // Search for files in directories matching the search term
            files = await neo4jService.searchFilesByDirectory(
              projectId,
              searchTerm
            );
            break;

          default: {
            // Default to Redis-based file path search
            const fileKeys = await redisService.scanKeys(
              `project:${projectId}:file:*${searchTerm}*`,
              'hash'
            );

            files = fileKeys.map((key) => {
              const filePath = key.replace(`project:${projectId}:file:`, '');
              const fileName = filePath.split('/').pop() || '';
              const dotIndex = fileName.lastIndexOf('.');
              const extension =
                dotIndex !== -1 ? fileName.substring(dotIndex) : '';

              return {
                path: filePath,
                name: fileName,
                extension,
              };
            });
          }
        }

        // Return search results
        if (files.length > 0) {
          return res.status(200).json({
            success: true,
            data: files,
          });
        }

        // No matching files found
        return res.status(404).json({
          success: false,
          message: `No files matching "${searchTerm}" found for project: ${projectId}`,
        });
      } else {
        // Basic file path search using Neo4j (without specific type)
        const files = await neo4jService.searchFilesByProject(
          projectId,
          searchTerm
        );

        if (files && files.length > 0) {
          return res.status(200).json({
            success: true,
            data: files,
          });
        }

        // No matching files found
        return res.status(404).json({
          success: false,
          message: `No files matching "${searchTerm}" found for project: ${projectId}`,
        });
      }
    }

    logger.info(
      `No search term provided, returning all files for project: ${projectId}`
    );
    // No search term provided, return all files for the project using Redis (faster for simple listing)
    // This is faster than Neo4j for simple listing of all files
    const files = await redisService.getProjectFiles(projectId);

    // Return files if found
    if (files && files.length > 0) {
      return res.status(200).json({
        success: true,
        data: files,
      });
    }

    // No files found for the project
    return res.status(404).json({
      success: false,
      message: `No files found for project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting files for project:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting project files: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

router.use('/:fileId', fileIdRouter);

export default router;
