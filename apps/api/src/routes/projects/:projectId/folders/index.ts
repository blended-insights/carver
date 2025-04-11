import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { neo4jService } from '@/services';
import folderIdRouter from './:folderId';
import folderPostRouter from './post';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting folders (directories) for a specific project
 *
 * Endpoints:
 * - GET /: Get all folders for a project, supports search functionality via query parameters
 * - GET /?search=term: Search folders by the given term
 *
 * Uses Neo4j for directory operations.
 * This makes the endpoint REST compliant by supporting search as a query parameter
 * rather than a separate endpoint.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const searchTerm = req.query.search as string | undefined;
    
    logger.info(
      `Getting folders for project: ${projectId}${
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

      // Search for directories by name or path
      const folders = await neo4jService.searchDirectoriesByProject(
        projectId,
        searchTerm
      );

      // Return search results
      if (folders.length > 0) {
        return res.status(200).json({
          success: true,
          data: folders,
        });
      }

      // No matching folders found
      return res.status(404).json({
        success: false,
        message: `No folders matching "${searchTerm}" found for project: ${projectId}`,
      });
    }

    // No search term provided, return all folders for the project
    logger.info(
      `No search term provided, returning all folders for project: ${projectId}`
    );
    
    const folders = await neo4jService.getDirectoriesByProject(projectId);

    // Return folders if found
    if (folders && folders.length > 0) {
      return res.status(200).json({
        success: true,
        data: folders,
      });
    }

    // No folders found for the project
    return res.status(404).json({
      success: false,
      message: `No folders found for project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting folders for project:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting project folders: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

router.use('/', folderPostRouter);
router.use('/:folderId', folderIdRouter);

export default router;
