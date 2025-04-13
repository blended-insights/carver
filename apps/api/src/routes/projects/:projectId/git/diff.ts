import { Router, Request, Response } from 'express';
import gitService from '@/services/git';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * @route GET /projects/:projectId/git/diff
 * @description Get unstaged changes diff
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Get unstaged diff
    const diff = await gitService.diff(projectPath);
    
    return res.status(200).json({
      success: true,
      data: diff
    });
  } catch (error) {
    logger.error('Error getting git diff:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /projects/:projectId/git/diff/staged
 * @description Get staged changes diff
 */
router.get('/staged', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Get staged diff
    const diff = await gitService.diffStaged(projectPath);
    
    return res.status(200).json({
      success: true,
      data: diff
    });
  } catch (error) {
    logger.error('Error getting git staged diff:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
