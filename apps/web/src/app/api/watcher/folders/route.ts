import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { applyCorsHeaders, handleOptionsRequest } from '@/utils';

// Get watcher API URL from environment variables
const WATCHER_API_URL =
  process.env.WATCHER_API_URL || 'http://localhost:4000';

export async function OPTIONS(request: NextRequest) {
  return handleOptionsRequest(request) || 
    NextResponse.json({}, { status: 204 });
}

/**
 * Handle GET requests to fetch all available folders
 */
export async function GET(request: NextRequest) {
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const response = await axios.get(`${WATCHER_API_URL}/folders`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return applyCorsHeaders(
      request,
      NextResponse.json(response.data)
    );
  } catch (error) {
    console.error('Error fetching folders:', error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while fetching folders',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
