'use server';

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { applyCorsHeaders, handleOptionsRequest } from '@/utils';

// Redis client configuration
const REDIS_URL = process.env.NEXT_PUBLIC_REDIS_URL || 'redis://localhost:6379';

// Create a Redis client
const createRedisClient = () => {
  return new Redis(REDIS_URL);
};

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  // Return a response with CORS headers
  return handleOptionsRequest(request) || 
    NextResponse.json({}, { status: 204 });
}

export async function GET(request: NextRequest) {
  // Handle OPTIONS preflight request
  const optionsRes = handleOptionsRequest(request);
  if (optionsRes) return optionsRes;

  // Create a Redis client for subscribing to channels
  const subscriber = createRedisClient();

  // Set up the channels to subscribe to
  const channels = ['watcher.status', 'file.change'];

  // Subscribe to the channels
  await Promise.all(
    channels.map(
      (channel) =>
        new Promise((resolve, reject) => {
          subscriber.subscribe(channel, (err) => {
            if (err) reject(err);
            else resolve(null);
          });
        })
    )
  );

  // Create a Stream controller to manage the SSE stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Send an initial connection message
  writer.write(new TextEncoder().encode(`:connected\n\n`));

  // Handle messages from Redis
  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.stringify({ channel, data: JSON.parse(message) });
      writer.write(new TextEncoder().encode(`data: ${data}\n\n`));
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnection
  request.signal.addEventListener('abort', () => {
    subscriber.quit();
    writer.close();
  });

  // Create response with SSE headers
  const response = new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });

  // Apply CORS headers to response
  return applyCorsHeaders(request, response);
}
