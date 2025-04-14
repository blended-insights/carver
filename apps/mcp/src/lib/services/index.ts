/**
 * Service initialization module for the Carver MCP server.
 * Handles creating and configuring service instances based on configuration.
 */

import { getConfig } from '../config';
import { logger } from '../logger';
import { CarverApi, CacheOptions } from './api';

// Service singletons
let apiInstance: CarverApi | null = null;

/**
 * Initialize and get the CarverApi client instance
 * @param cacheOptions Optional cache configuration
 * @returns Configured CarverApi instance
 */
export function getApi(cacheOptions?: Partial<CacheOptions>): CarverApi {
  if (apiInstance) {
    // If we already have an instance but cacheOptions were provided,
    // configure the caching on the existing instance
    if (cacheOptions) {
      apiInstance.configureCaching(cacheOptions);
    }
    return apiInstance;
  }

  const config = getConfig();

  logger.debug('Initializing API client', {
    host: config.host,
    port: config.port,
    cacheEnabled: cacheOptions?.enabled,
    cacheTTL: cacheOptions?.ttl,
  });

  apiInstance = new CarverApi(config.host, config.port, cacheOptions);

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
 * @param cacheOptions Optional cache configuration
 */
export function initializeServices(cacheOptions?: Partial<CacheOptions>): void {
  // Initialize API client
  getApi(cacheOptions);

  // Initialize other services here as needed

  logger.debug('All services initialized');
}
