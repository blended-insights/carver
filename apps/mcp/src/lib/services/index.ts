/**
 * Service initialization module for the Carver MCP server.
 * Handles creating and configuring service instances based on configuration.
 */

import { getConfig } from '../config';
import { logger } from '../logger';
import { CarverApiClient } from './api';

// Service singletons
let apiClient: CarverApiClient | null = null;

/**
 * Initialize the API client using configuration settings
 * @returns Configured API client instance
 */
export function getApiClient(): CarverApiClient {
  if (apiClient) {
    return apiClient;
  }

  const config = getConfig();

  logger.debug('Initializing API client', {
    host: config.host,
    port: config.port,
  });

  apiClient = new CarverApiClient(config.host, config.port);

  return apiClient;
}

/**
 * Initialize all services required by the application
 */
export function initializeServices(): void {
  // Initialize API client
  getApiClient();

  // Initialize other services here as needed

  logger.debug('All services initialized');
}
