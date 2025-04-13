import { ApiError } from '@/lib/services/api';

/**
 * Standard error response structure for tool functions
 */
export interface ErrorResponse {
  error: true;
  statusCode: number;
  message: string;
  details?: Record<string, any>;
}

/**
 * Create a standardized error response object for API errors
 * 
 * @param error The caught error object
 * @param contextMessage Additional context about the operation that failed
 * @returns Formatted error response for MCP tools
 */
export function createErrorResponse(error: unknown, contextMessage: string): ErrorResponse {
  let errorMessage = contextMessage; 
  let statusCode = 500;
  let errorDetails: Record<string, any> = {};
  
  // Handle ApiError with specific details
  if (error instanceof ApiError) {
    // Use the detailed message from our custom ApiError
    errorMessage = error.getDetailedMessage();
    statusCode = error.status || 500;
    
    // Include any additional API error details
    if (error.responseData) {
      errorDetails = {
        ...errorDetails,
        apiResponse: error.responseData
      };
    }
    
    if (error.code) {
      errorDetails.code = error.code;
    }
  } 
  // Handle standard errors
  else if (error instanceof Error) {
    errorMessage = `${contextMessage}: ${error.message}`;
    if (error.stack) {
      errorDetails.stack = error.stack.split('\n').slice(0, 3).join('\n');
    }
  } 
  // Handle any other error type
  else {
    errorMessage = `${contextMessage}: ${String(error)}`;
  }
  
  return {
    error: true,
    statusCode,
    message: errorMessage,
    details: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
  };
}

/**
 * Format an error response as a JSON string
 * @param error The error to format
 * @param contextMessage Additional context message
 * @returns Formatted JSON string of the error
 */
export function formatErrorResponse(error: unknown, contextMessage: string): string {
  const errorResponse = createErrorResponse(error, contextMessage);
  return JSON.stringify(errorResponse, null, 2);
}
