import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { applyCorsHeaders, handleOptionsRequest } from '@/utils';

// Get watcher API URL from environment variables
const INTERNAL_WATCHER_API_URL =
  process.env.INTERNAL_WATCHER_API_URL || 'http://localhost:4000';

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleOptionsRequest(request) || 
    NextResponse.json({}, { status: 204 });
}

/**
 * Handle POST requests to the admin danger zone endpoints
 */
export async function POST(request: NextRequest) {
  // Handle OPTIONS preflight request
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { success: false, message: 'Action is required' },
          { status: 400 }
        )
      );
    }

    // Execute the appropriate action
    switch (action) {
      case 'flush-redis': {
        const result = await flushRedis();
        return applyCorsHeaders(
          request,
          NextResponse.json(result, {
            status: result.success ? 200 : 500,
          })
        );
      }
      case 'clear-neo4j': {
        const result = await clearNeo4j();
        return applyCorsHeaders(
          request,
          NextResponse.json(result, {
            status: result.success ? 200 : 500,
          })
        );
      }
      case 'clear-all': {
        // Execute both actions
        const redisResult = await flushRedis();
        const neo4jResult = await clearNeo4j();

        if (redisResult.success && neo4jResult.success) {
          return applyCorsHeaders(
            request,
            NextResponse.json({
              success: true,
              message: 'Both Redis and Neo4j have been cleared successfully',
              details: {
                redis: redisResult.message,
                neo4j: neo4jResult.message,
              },
            })
          );
        } else {
          return applyCorsHeaders(
            request,
            NextResponse.json(
              {
                success: false,
                message: 'Failed to clear one or both databases',
                details: {
                  redis: {
                    success: redisResult.success,
                    message: redisResult.message,
                  },
                  neo4j: {
                    success: neo4jResult.success,
                    message: neo4jResult.message,
                  },
                },
              },
              { status: 500 }
            )
          );
        }
      }
      default:
        return applyCorsHeaders(
          request,
          NextResponse.json(
            { success: false, message: 'Invalid action' },
            { status: 400 }
          )
        );
    }
  } catch (error) {
    console.error('Error in admin danger zone API:', error);
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          success: false,
          message: 'An error occurred while processing the request',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}

/**
 * Flush Redis data
 */
async function flushRedis(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const response = await axios.post(
      `${INTERNAL_WATCHER_API_URL}/admin/redis/flush`,
      {}, // Empty data object
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error('Error flushing Redis:', error);
    return {
      success: false,
      message: 'Failed to flush Redis',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clear Neo4j database
 */
async function clearNeo4j(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const response = await axios.post(
      `${INTERNAL_WATCHER_API_URL}/admin/neo4j/clear`,
      {}, // Empty data object
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error('Error clearing Neo4j:', error);
    return {
      success: false,
      message: 'Failed to clear Neo4j database',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
