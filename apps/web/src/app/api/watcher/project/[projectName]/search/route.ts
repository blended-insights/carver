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
 * Handle GET requests to search files in a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectName: string } }
) {
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const { projectName } = params;
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('term');
    
    if (!searchTerm) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          {
            success: false,
            message: 'Search term is required',
          },
          { status: 400 }
        )
      );
    }
    
    const response = await axios.get(
      `${WATCHER_API_URL}/project/${encodeURIComponent(projectName)}/search?term=${encodeURIComponent(searchTerm)}`,
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
    console.error('Error searching project files:', error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while searching project files',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
