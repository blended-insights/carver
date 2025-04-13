import { create, isAxiosError, type AxiosInstance, type AxiosError } from 'axios';
import { ApiResponse } from './types';

/**
 * Custom API error class for better error handling
 */
export class ApiError extends Error {
  status?: number;
  code?: string;
  responseData?: any;
  
  constructor(message: string, axiosError?: AxiosError) {
    super(message);
    this.name = 'ApiError';
    
    if (axiosError) {
      this.status = axiosError.response?.status;
      this.code = axiosError.code;
      this.responseData = axiosError.response?.data;
      
      // Add stack trace from original error if available
      if (axiosError.stack) {
        this.stack = axiosError.stack;
      }
    }
  }
  
  /**
   * Get a formatted error message with details for debugging
   */
  getDetailedMessage(): string {
    let message = this.message;
    
    if (this.status) {
      message += ` (Status: ${this.status})`;
    }
    
    if (this.responseData?.message) {
      message += `: ${this.responseData.message}`;
    }
    
    return message;
  }
}

/**
 * Carver API client
 */
export class CarverApiClient {
  private client: AxiosInstance;

  /**
   * Creates a new API client instance
   * @param host Optional host override (defaults to localhost)
   * @param port Optional port override (defaults to 4000)
   */
  constructor(host?: string, port?: number) {
    // If host and port are provided, construct baseURL from them
    const apiHost = host || 'localhost';
    const apiPort = port || 4000;
    const baseURL = `http://${apiHost}:${apiPort}`;

    // Create axios instance with default configuration
    this.client = create({
      baseURL,
      timeout: 10000, // 10 seconds timeout
      headers: { 'Content-Type': 'application/json' },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Log error details but don't swallow the error
        console.error('API request failed:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Transform an error into a standardized ApiError
   * @param error The caught error
   * @param defaultMessage Default error message if none available
   */
  protected createApiError(error: unknown, defaultMessage: string): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    
    if (isAxiosError(error)) {
      // If the API returned an error message, use it
      const apiMessage = error.response?.data?.message || defaultMessage;
      return new ApiError(apiMessage, error);
    }
    
    // For other errors, convert to ApiError
    const message = error instanceof Error ? error.message : String(error);
    return new ApiError(message || defaultMessage);
  }

  /**
   * Get the Axios client instance (for direct use when needed)
   */
  getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Make a GET request to the API
   * @param endpoint API endpoint
   * @param params Query parameters
   * @returns Response data
   */
  async get<T>(
    endpoint: string, 
    params?: Record<string, string | number>
  ): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(endpoint, { params });
    
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    
    throw new ApiError(response.data.message || `Failed to GET ${endpoint}`);
  }

  /**
   * Make a POST request to the API
   * @param endpoint API endpoint
   * @param data Request body
   * @returns Response data
   */
  async post<T>(
    endpoint: string, 
    data: unknown
  ): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(endpoint, data);
    
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    
    throw new ApiError(response.data.message || `Failed to POST to ${endpoint}`);
  }

  /**
   * Make a PUT request to the API
   * @param endpoint API endpoint
   * @param data Request body
   * @returns Response data
   */
  async put<T>(
    endpoint: string, 
    data: unknown
  ): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(endpoint, data);
    
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    
    throw new ApiError(response.data.message || `Failed to PUT to ${endpoint}`);
  }

  /**
   * Make a PATCH request to the API
   * @param endpoint API endpoint
   * @param data Request body
   * @returns Response data
   */
  async patch<T>(
    endpoint: string, 
    data: unknown
  ): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(endpoint, data);
    
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    
    throw new ApiError(response.data.message || `Failed to PATCH ${endpoint}`);
  }

  /**
   * Make a DELETE request to the API
   * @param endpoint API endpoint
   * @returns Response data
   */
  async delete<T>(
    endpoint: string
  ): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(endpoint);
    
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    
    throw new ApiError(response.data.message || `Failed to DELETE ${endpoint}`);
  }
}
