import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { commandExecutor } from '@/services/command-executor';
import buildProjectPath from '@/utils/path-builder';

const router = Router({ mergeParams: true });

/**
 * Get allowed commands
 * GET /projects/:projectId/commands
 *
 * Returns information about commands that can be executed
 * including the allowed command list and configuration source
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "allowedCommands": ["npm", "npx", "yarn", "pnpm"],
 *     "config": {
 *       "source": "environment", // or "default"
 *       "rawValue": "npm,npx,yarn,pnpm"
 *     }
 *   }
 * }
 */
router.get('/', async (req: Request, res: Response) => {
  const { projectId } = req.params;

  logger.debug(`Getting allowed commands for project ${projectId}`);

  try {
    // Get allowed commands list
    const allowedCommands = commandExecutor.getAllowedCommands();
    const config = commandExecutor.getAllowedCommandsConfig();

    return res.status(200).json({
      success: true,
      data: {
        allowedCommands,
        config,
      },
    });
  } catch (error) {
    logger.error(
      `Error getting allowed commands for project ${projectId}:`,
      error
    );

    return res.status(500).json({
      success: false,
      message: `Error getting allowed commands: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

/**
 * Execute a command in the project's root directory
 * POST /projects/:projectId/commands
 *
 * Request body:
 * {
 *   "command": "npm", // The command to execute (must be in allowlist)
 *   "args": ["run", "lint"] // Arguments to pass to the command
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "stdout": "...",
 *     "stderr": "...",
 *     "exitCode": 0
 *   }
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { command, args } = req.body;

  logger.info(
    `Executing command for project ${projectId}: ${command} ${
      args?.join(' ') || ''
    }`
  );

  // Validate required fields
  if (!command) {
    return res.status(400).json({
      success: false,
      message: 'Command is required in the request body',
    });
  }

  // Ensure args is an array
  if (args && !Array.isArray(args)) {
    return res.status(400).json({
      success: false,
      message: 'Arguments must be an array',
    });
  }

  try {
    // Execute the command
    const result = await commandExecutor.executeCommand({
      command,
      args: args || [],
      cwd: buildProjectPath(projectId),
    });

    // Return the command result
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`Error executing command for project ${projectId}:`, error);

    // If the error is from the command executor (invalid command)
    if (error instanceof Error && error.message.includes('is not allowed')) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    // General server error
    return res.status(500).json({
      success: false,
      message: `Error executing command: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;
