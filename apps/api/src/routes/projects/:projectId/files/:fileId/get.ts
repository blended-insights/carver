import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { redisService } from '@/services';

const router = Router({ mergeParams: true });

/**
 * Route handler for getting a specific file from a project
 * Uses Redis to get a file with key project:projectId:file:fileId
 * Allows selection of fields (content, hash, lastModified)
 */
router.get('/', async (req: Request, res: Response) => {
  logger.debug('Getting file for project', req.params);
  try {
    const { projectId, fileId } = req.params;

    logger.info(`Getting file ${fileId} for project: ${projectId}`);

    // Extract fields from query string, default to all fields if not specified
    const fields = req.query.fields
      ? String(req.query.fields).split(',')
      : ['content', 'hash', 'lastModified'];

    // Validate fields to ensure only allowed fields are requested
    const validFields = ['content', 'hash', 'lastModified'];
    const sanitizedFields = fields.filter((field) =>
      validFields.includes(field)
    );

    if (sanitizedFields.length === 0) {
      sanitizedFields.push(...validFields); // Default to all fields if none were valid
    }

    logger.info(
      `Getting file ${fileId} for project: ${projectId} with fields: ${sanitizedFields.join(
        ','
      )}`
    );

    // Get file data from Redis with selected fields
    const fileData = await redisService.getProjectFile(
      projectId,
      fileId,
      sanitizedFields
    );

    // Return file data if found
    if (fileData) {
      return res.status(200).json({
        success: true,
        data: fileData,
      });
    }

    // File not found
    return res.status(404).json({
      success: false,
      message: `File ${fileId} not found in project: ${projectId}`,
    });
  } catch (error) {
    logger.error(`Error getting file for project:`, error);
    return res.status(500).json({
      success: false,
      message: `Error getting project file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
