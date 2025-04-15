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
 * Handle GET requests to fetch a specific watcher
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { processId: string } }
) {
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const { processId } = params;
    const response = await axios.get(
      `${WATCHER_API_URL}/watchers/${encodeURIComponent(processId)}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return applyCorsHeaders(
      request,
      NextResponse.json(response.data)
    );
  } catch (error) {
    console.error('Error fetching watcher:', error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while fetching the watcher',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}

/**
 * Handle POST requests to [processId]/kill endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { processId: string } }
) {
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const { processId } = params;
    const url = request.nextUrl.pathname;
    const action = url.endsWith('/kill') ? 'kill' : url.endsWith('/restart') ? 'restart' : '';
    
    if (!action) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          {
            success: false,
            message: 'Invalid action. Supported actions: /kill, /restart',
          },
          { status: 400 }
        )
      );
    }
    
    const response = await axios.post(
      `${WATCHER_API_URL}/watchers/${encodeURIComponent(processId)}/${action}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return applyCorsHeaders(
      request,
      NextResponse.json(response.data)
    );
  } catch (error) {
    console.error(`Error processing watcher action:`, error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while processing the watcher action',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
