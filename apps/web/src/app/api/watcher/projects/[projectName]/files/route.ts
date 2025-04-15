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
 * Handle GET requests to fetch files for a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectName: string } }
) {
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const { projectName } = params;
    const response = await axios.get(
      `${WATCHER_API_URL}/projects/${encodeURIComponent(projectName)}/files`,
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
    console.error('Error fetching project files:', error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while fetching project files',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
