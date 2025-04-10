import { NextRequest } from 'next/server';
import Redis from 'ioredis';

// Redis client configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a Redis client
const createRedisClient = () => {
  return new Redis(REDIS_URL);
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

  // Return the stream as SSE
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
