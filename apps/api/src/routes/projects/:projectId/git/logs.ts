import { Router, Request, Response } from 'express';
import gitService from '@/services/git';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * @route GET /projects/:projectId/git/logs
 * @description Get commit logs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Get maxCount from query parameters
    const maxCount = req.query.maxCount 
      ? parseInt(req.query.maxCount as string, 10) 
      : undefined;
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Get commit logs
    const logs = await gitService.log(projectPath, { maxCount });
    
    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Error getting git logs:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
