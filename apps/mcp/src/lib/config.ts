/**
 * Configuration module for the Carver MCP server.
 * Handles command-line arguments, environment variables, and configuration files.
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

export interface CarverConfig {
  // Server options
  verbose: boolean;
  debug: boolean;
  port?: number;
  host?: string;
  configPath?: string;

  // Additional configuration properties
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  environment: 'development' | 'production' | 'test';
}

/**
 * Default configuration values
 */
const defaultConfig: CarverConfig = {
  verbose: false,
  debug: false,
  logLevel: 'info',
  host: 'localhost',
  environment:
    (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
    'development',
};

/**
 * Parse command-line arguments using Commander
 */
function parseCommandLineArguments(): Partial<CarverConfig> {
  const program = new Command();

  program
    .name('carver-mcp')
    .description('Carver MCP (Model Context Protocol) server')
    .version('1.0.0');

  program
    .option('-v, --verbose', 'Enable verbose logging')
    .option(
      '-p, --port <number>',
      'Port for HTTP transport (if used instead of stdio)',
      parseIntOption
    )
    .option(
      '-H, --host <address>',
      'Host address for HTTP transport (defaults to localhost)'
    )
    .option('-d, --debug', 'Enable debug mode')
    .option('-c, --config <path>', 'Path to configuration file')
    .option(
      '-l, --log-level <level>',
      'Log level (error, warn, info, debug)',
      validateLogLevel
    );

  program.parse();

  return program.opts();
}

/**
 * Load configuration from file if specified
 */
function loadConfigFile(configPath?: string): Partial<CarverConfig> {
  if (!configPath) {
    return {};
  }

  try {
    const resolvedPath = path.resolve(configPath);
    const fileContents = fs.readFileSync(resolvedPath, 'utf-8');
    return JSON.parse(fileContents) as Partial<CarverConfig>;
  } catch (error) {
    console.error(`Error loading config file from ${configPath}:`, error);
    return {};
  }
}

/**
 * Load configuration from environment variables
 */
function loadEnvironmentVariables(): Partial<CarverConfig> {
  return {
    verbose: process.env.CARVER_VERBOSE === 'true',
    debug: process.env.CARVER_DEBUG === 'true',
    port: process.env.CARVER_PORT
      ? parseInt(process.env.CARVER_PORT, 10)
      : undefined,
    host: process.env.CARVER_HOST || undefined,
    logLevel: validateLogLevel(process.env.CARVER_LOG_LEVEL),
    environment:
      (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
      'development',
  };
}

/**
 * Helper function to parse integer options
 */
function parseIntOption(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

/**
 * Helper function to validate log level
 */
function validateLogLevel(value?: string): 'error' | 'warn' | 'info' | 'debug' {
  if (!value) return defaultConfig.logLevel;

  const level = value.toLowerCase();
  if (['error', 'warn', 'info', 'debug'].includes(level)) {
    return level as 'error' | 'warn' | 'info' | 'debug';
  }

  console.warn(
    `Invalid log level: ${value}. Using default: ${defaultConfig.logLevel}`
  );
  return defaultConfig.logLevel;
}

/**
 * Load and merge configurations from various sources
 * Priority (highest to lowest): Command line args > Environment vars > Config file > Defaults
 */
export function loadConfig(): CarverConfig {
  const cliArgs = parseCommandLineArguments();
  const fileConfig = loadConfigFile(cliArgs.configPath);
  const envConfig = loadEnvironmentVariables();

  // Merge configurations with appropriate priority
  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
    ...cliArgs,
  };
}

/**
 * Get the current configuration
 */
let currentConfig: CarverConfig | null = null;

export function getConfig(): CarverConfig {
  if (!currentConfig) {
    currentConfig = loadConfig();
  }
  return currentConfig;
}
