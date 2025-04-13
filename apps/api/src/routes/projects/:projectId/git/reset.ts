import { Router, Request, Response } from 'express';
import gitService from '@/services/git';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * @route POST /projects/:projectId/git/reset
 * @description Reset staged changes (unstage all files)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Reset staged changes
    const result = await gitService.reset(projectPath);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error resetting git staged changes:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
