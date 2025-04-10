/**
 * Logger utility for the Carver MCP server.
 * Provides structured logging with configurable levels.
 */

import { getConfig } from './config';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Map of log levels to their numeric priority
 * Higher number = higher priority
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

/**
 * Checks if a log message should be printed based on configured log level
 */
function shouldLog(messageLevel: LogLevel): boolean {
  const config = getConfig();
  const configuredPriority = LOG_LEVEL_PRIORITY[config.logLevel];
  const messagePriority = LOG_LEVEL_PRIORITY[messageLevel];
  
  return messagePriority >= configuredPriority;
}

/**
 * Format a log message with timestamp and metadata
 */
function formatLogMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (meta && Object.keys(meta).length > 0) {
    formattedMessage += ` ${JSON.stringify(meta)}`;
  }
  
  return formattedMessage;
}

/**
 * Logger object with methods for different log levels
 */
export const logger = {
  /**
   * Log an error message
   */
  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      console.error(formatLogMessage('error', message, meta));
    }
  },
  
  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('warn')) {
      console.warn(formatLogMessage('warn', message, meta));
    }
  },
  
  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('info')) {
      // Use console.error to avoid interfering with stdio transport
      console.error(formatLogMessage('info', message, meta));
    }
  },
  
  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('debug')) {
      // Use console.error to avoid interfering with stdio transport
      console.error(formatLogMessage('debug', message, meta));
    }
  },
};
