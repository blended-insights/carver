import { Router, Request, Response } from 'express';
import gitService from '@/services/git';
import logger from '@/utils/logger';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * @route POST /projects/:projectId/git/branches
 * @description Create a new branch
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get project ID from the route parameters
    const { projectId } = req.params;
    
    // Get branch name and base branch from the request body
    const { name, baseBranch } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Branch name is required'
      });
    }
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Create branch
    const result = await gitService.createBranch(projectPath, name, baseBranch);
    
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error creating git branch:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /projects/:projectId/git/branches/:branchName
 * @description Checkout a branch
 */
router.post('/:branchName', async (req: Request, res: Response) => {
  try {
    // Get project ID and branch name from the route parameters
    const { projectId, branchName } = req.params;
    
    // Build full project path
    const projectPath = buildProjectPath(projectId);
    
    // Checkout branch
    const result = await gitService.checkout(projectPath, branchName);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error checking out branch ${req.params.branchName}:`, error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
