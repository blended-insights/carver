import { Router, Request, Response } from 'express';
import gitService from '@/services/git';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * @route POST /projects/:projectId/git/add
 * @description Add files to the git staging area
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Get files from the request body
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        message: 'Files array is required'
      });
    }
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Add files to git staging
    const result = await gitService.add(projectPath, files);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error adding files to git staging:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
