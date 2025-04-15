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
 * Handle POST requests to start a watcher for a specific folder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { folderPath: string } }
) {
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const { folderPath } = params;
    
    // Check for optional project name query parameter
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('project');
    
    // Build the URL with or without the project query parameter
    let apiUrl = `${WATCHER_API_URL}/folders/${encodeURIComponent(folderPath)}/start`;
    if (projectName) {
      apiUrl += `?project=${encodeURIComponent(projectName)}`;
    }
    
    const response = await axios.post(
      apiUrl,
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
    console.error('Error starting watcher:', error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while starting the watcher',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
