import type { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

/**
 * Request logger middleware
 * Logs detailed information about each incoming request
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = process.hrtime();
  const { method, originalUrl, ip, headers } = req;

  // Create a unique request ID
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 15)}`;

  // Log request start
  logger.debug(`[${requestId}] Request started: ${method} ${originalUrl}`, {
    requestId,
    method,
    url: originalUrl,
    ip,
    userAgent: headers['user-agent'],
    contentType: headers['content-type'],
    timestamp: new Date().toISOString(),
  });

  // Log request body if it exists and isn't too large (avoid logging large file uploads)
  if (
    req.body &&
    Object.keys(req.body).length > 0 &&
    (!req.headers['content-length'] ||
      parseInt(req.headers['content-length'] as string) < 10000)
  ) {
    logger.debug(`[${requestId}] Request body:`, {
      requestId,
      body: req.body,
    });
  }

  // Capture response data
  const originalSend = res.send;
  res.send = function (body) {
    const endTime = process.hrtime(startTime);
    const responseTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);

    // Log response information
    logger.debug(`[${requestId}] Request completed: ${method} ${originalUrl}`, {
      requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: body ? body.length : 0,
      timestamp: new Date().toISOString(),
    });

    // Log response body for JSON responses (but not for large responses)
    if (
      res.getHeader('content-type')?.toString().includes('application/json') &&
      body &&
      body.length < 10000
    ) {
      try {
        const jsonBody = typeof body === 'string' ? JSON.parse(body) : body;
        // If it's an error response (4xx, 5xx), log at warn level
        if (res.statusCode >= 400) {
          logger.warn(`[${requestId}] Error response:`, {
            requestId,
            statusCode: res.statusCode,
            response: jsonBody,
          });
        } else {
          logger.debug(`[${requestId}] Response body:`, {
            requestId,
            response: jsonBody,
          });
        }
      } catch (e) {
        // If JSON parsing fails, just log basic info
        logger.debug(
          `[${requestId}] Response body could not be parsed as JSON`
        );
      }
    }

    return originalSend.call(this, body);
  };

  // Continue to the next middleware or route handler
  next();
};
