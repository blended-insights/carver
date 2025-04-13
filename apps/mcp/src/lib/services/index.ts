/**
 * Service initialization module for the Carver MCP server.
 * Handles creating and configuring service instances based on configuration.
 */

import { getConfig } from '../config';
import { logger } from '../logger';
import { CarverApi } from './api';

// Service singletons
let apiInstance: CarverApi | null = null;

/**
 * Initialize and get the CarverApi client instance
 * @returns Configured CarverApi instance
 */
export function getApi(): CarverApi {
  if (apiInstance) {
    return apiInstance;
  }

  const config = getConfig();

  logger.debug('Initializing API client', {
    host: config.host,
    port: config.port,
  });

  apiInstance = new CarverApi(config.host, config.port);

  return apiInstance;
}

/**
 * Get the API client singleton instance 
 * @returns CarverApi instance
 * @deprecated Use getApi() instead which provides a more structured API access
 */
export function getApiClient(): CarverApi {
  return getApi();
}

/**
 * Initialize all services required by the application
 */
export function initializeServices(): void {
  // Initialize API client
  getApi();

  // Initialize other services here as needed

  logger.debug('All services initialized');
}
