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
 * Handle POST requests to kill a watcher
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { processId: string } }
) {
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const { processId } = params;
    const response = await axios.post(
      `${WATCHER_API_URL}/watchers/${encodeURIComponent(processId)}/kill`,
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
    console.error('Error killing watcher:', error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while killing the watcher',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
