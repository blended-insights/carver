import { promisify } from 'util';
import { exec, ExecOptions } from 'child_process';
import logger from '../../utils/logger';

const execAsync = promisify(exec);

/**
 * List of allowed commands to execute for security
 * This whitelist ensures only specific commands can be executed
 * Read from environment variable ALLOWED_COMMANDS or use default value
 */
const ALLOWED_COMMANDS = (process.env.ALLOWED_COMMANDS || 'npm,npx,yarn,pnpm')
  .split(',')
  .map((cmd) => cmd.trim())
  .filter((cmd) => cmd !== '');

/**
 * Interface for command execution options
 */
export interface CommandExecutionOptions {
  /**
   * The command to execute (must be in the allowed list)
   */
  command: string;

  /**
   * Arguments to pass to the command
   */
  args: string[];

  /**
   * Working directory where the command will be executed
   */
  cwd: string;

  /**
   * Optional timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Interface for command execution result
 */
export interface CommandExecutionResult {
  /**
   * Standard output from the command
   */
  stdout: string;

  /**
   * Standard error from the command
   */
  stderr: string;

  /**
   * Exit code of the command (0 typically means success)
   */
  exitCode: number;
}

/**
 * Service to safely execute commands on project directories
 */
export class CommandExecutor {
  /**
   * Execute a command with the given options
   * @param options Command execution options
   * @returns Result of command execution
   * @throws Error if command is not allowed or execution fails
   */
  public async executeCommand(
    options: CommandExecutionOptions
  ): Promise<CommandExecutionResult> {
    const { command, args, cwd, timeout = 30000 } = options;

    // Security check: Only allow specific commands
    if (!ALLOWED_COMMANDS.includes(command)) {
      logger.warn(
        `Command execution blocked: ${command} is not in the allowed list`
      );
      throw new Error(
        `Command '${command}' is not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(
          ', '
        )}`
      );
    }

    // Sanitize and join arguments
    const sanitizedArgs = args.map((arg) => arg.trim()).join(' ');
    const fullCommand = `${command} ${sanitizedArgs}`;

    logger.info(`Executing command: ${fullCommand} in directory: ${cwd}`);

    try {
      const execOptions: ExecOptions = {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      };

      const { stdout, stderr } = await execAsync(fullCommand, execOptions);

      // Log truncated output for debugging
      if (stdout.length > 0) {
        logger.debug(
          `Command stdout (truncated): ${stdout.substring(0, 200)}${
            stdout.length > 200 ? '...' : ''
          }`
        );
      }

      if (stderr.length > 0) {
        logger.debug(
          `Command stderr (truncated): ${stderr.substring(0, 200)}${
            stderr.length > 200 ? '...' : ''
          }`
        );
      }

      return {
        stdout,
        stderr,
        exitCode: 0, // execAsync resolves with 0 exit code, otherwise it throws
      };
    } catch (error) {
      // Handle errors with exit codes
      if (
        error instanceof Error &&
        'code' in error &&
        'stdout' in error &&
        'stderr' in error
      ) {
        const execError = error as unknown as {
          code: number;
          stdout: string;
          stderr: string;
        };

        logger.error(
          `Command failed with exit code ${execError.code}: ${fullCommand}`
        );

        return {
          stdout: execError.stdout || '',
          stderr: execError.stderr || '',
          exitCode: execError.code || 1,
        };
      }

      // Handle other errors
      logger.error(`Error executing command: ${fullCommand}`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const commandExecutor = new CommandExecutor();

export default commandExecutor;
