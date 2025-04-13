import { Router, Request, Response } from 'express';
import gitService from '@/services/git';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * @route GET /projects/:projectId/git/status
 * @description Get status of the git repository
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Get git status
    const status = await gitService.status(projectPath);
    
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting git status:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
