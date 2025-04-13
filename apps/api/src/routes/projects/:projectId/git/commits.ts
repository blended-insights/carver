import { Router, Request, Response } from 'express';
import gitService from '@/services/git';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * @route POST /projects/:projectId/git/commits
 * @description Create a new commit
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Get message from the request body
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Commit message is required'
      });
    }
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Create commit
    const result = await gitService.commit(projectPath, message);
    
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error creating git commit:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /projects/:projectId/git/commits/:revision
 * @description Get detailed info about a specific commit
 */
router.get('/:revision', async (req: Request, res: Response) => {
  try {
    // Get project ID and revision from the route parameters
    const { projectId, revision } = req.params;
    
    if (!revision) {
      return res.status(400).json({
        success: false,
        message: 'Commit revision is required'
      });
    }
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Get commit details
    const commitInfo = await gitService.show(projectPath, revision);
    
    return res.status(200).json({
      success: true,
      data: commitInfo
    });
  } catch (error) {
    logger.error(`Error getting git commit info for revision ${req.params.revision}:`, error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
