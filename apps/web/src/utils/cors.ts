import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Apply CORS headers to response
 *
 * @param req The incoming request
 * @param res The response to modify
 * @returns The modified response with CORS headers
 */
export function applyCorsHeaders(
  req: NextRequest,
  res: NextResponse | Response
): NextResponse | Response {
  // Define allowed origins based on environment
  const allowedOrigin =
    process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS || 'https://app.carver.dev'
      : 'http://localhost:3000';

  // Get origin from request
  const origin = req.headers.get('origin') || '';

  // Check if the origin is allowed
  const isAllowedOrigin =
    allowedOrigin.includes('*') || allowedOrigin.split(',').includes(origin);

  // Set the actual origin or the allowed origin
  const corsOrigin = isAllowedOrigin ? origin : allowedOrigin;

  // Set common CORS headers
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Origin', corsOrigin);
  res.headers.set(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  );
  res.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  return res;
}

/**
 * Handle OPTIONS preflight requests for CORS
 *
 * @param req The incoming request
 * @returns Response for preflight requests
 */
export function handleOptionsRequest(
  req: NextRequest
): NextResponse | Response | null {
  if (req.method === 'OPTIONS') {
    // Create an empty response for preflight requests
    const response = NextResponse.json({}, { status: 204 });
    return applyCorsHeaders(req, response);
  }

  // Not an OPTIONS request, continue normal processing
  return null;
}
