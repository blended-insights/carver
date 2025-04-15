import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import logger from './logger';

/**
 * Creates an API client that routes requests through Next.js API routes
 *
 * @param basePath Base path for the API route (e.g., 'admin', 'watcher')
 * @param config Additional Axios configuration
 * @returns Configured Axios instance
 */
export function createApiClient(
  basePath: string,
  config?: AxiosRequestConfig
): AxiosInstance {
  const baseURL = `/api/${basePath}`;

  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config,
  });

  // Add request interceptor for debugging
  client.interceptors.request.use(
    (config) => {
      logger.debug(
        `API Request: ${config.method?.toUpperCase()} ${config.url}`
      );
      return config;
    },
    (error) => {
      logger.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling and logging
  client.interceptors.response.use(
    (response) => {
      logger.debug(`API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      // Log the error with better context
      if (error.response) {
        // Server responded with non-2xx status
        logger.error(
          `API Error ${error.response.status}: ${
            error.response.data?.error || error.message
          }`,
          error.config?.url
        );
      } else if (error.request) {
        // Request was made but no response received
        logger.error(`API No Response: ${error.message}`, error.config?.url);

        // Check if the error is a CORS error
        if (error.message && error.message.includes('Network Error')) {
          // Create a more helpful error message
          error.message =
            'Network Error: This may be due to CORS issues. Make sure the API server has CORS enabled and is running.';
        }
      } else {
        // Something else happened
        logger.error(`API Setup Error: ${error.message}`);
      }

      return Promise.reject(error);
    }
  );

  return client;
}
