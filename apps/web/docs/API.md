# Carver Dashboard API Documentation

This document details the API integration between the Carver Dashboard and the Watcher service.

## API Client Setup

The dashboard uses Axios for API requests. The client is configured in `src/utils/api.ts`:

```typescript
import axios from 'axios';

// API client setup
const apiClient = axios.create({
  baseURL: process.env.INTERNAL_WATCHER_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## API Endpoints

### Fetch Available Folders

**Function**: `fetchAvailableFolders()`  
**Method**: GET  
**Endpoint**: `/folders`  
**Description**: Retrieves a list of available folders that can be watched.

**Response Format**:
```json
{
  "success": true,
  "data": [
    "/path/to/folder1",
    "/path/to/folder2",
    "/path/to/folder3"
  ]
}
```

**Usage Example**:
```typescript
import { fetchAvailableFolders } from '../utils/api';

// Inside async function
const folders = await fetchAvailableFolders();
console.log(folders); // Array of folder paths
```

### Start Watcher

**Function**: `startWatcher(folder: string)`  
**Method**: GET  
**Endpoint**: `/folders/:folderPath/start?project=project-name`  
**Description**: Starts a new watcher process for the specified folder.

**Request Parameters**:
- `folder` (query parameter): Path to the folder to watch

**Response Format**:
```json
{
  "success": true,
  "processId": "watcher-1743732509429-60jma8x",
  "message": "Started file watcher for /path/to/folder with process ID: watcher-1743732509429-60jma8x"
}
```

**Usage Example**:
```typescript
import { startWatcher } from '../utils/api';

// Inside async function
const result = await startWatcher('/path/to/my/project');
console.log(result.processId); // The new watcher process ID
```

### Kill Watcher

**Function**: `killWatcher(processId: string)`  
**Method**: POST  
**Endpoint**: `/watchers/:processId/kill`  
**Description**: Stops a running watcher process.

**Request Parameters**:
- `processId` (query parameter): ID of the watcher process to kill

**Response Format**:
```json
{
  "success": true,
  "message": "Watcher process watcher-1743732509429-60jma8x has been killed"
}
```

**Usage Example**:
```typescript
import { killWatcher } from '../utils/api';

// Inside async function
await killWatcher('watcher-1743732509429-60jma8x');
```

### Restart Watcher

**Function**: `restartWatcher(processId: string)`  
**Method**: POST  
**Endpoint**: `/watchers/:processId/restart`  
**Description**: Restarts a watcher process.

**Request Parameters**:
- `processId` (query parameter): ID of the watcher process to restart

**Response Format**:
```json
{
  "success": true,
  "message": "Watcher process watcher-1743732509429-60jma8x has been restarted"
}
```

**Usage Example**:
```typescript
import { restartWatcher } from '../utils/api';

// Inside async function
await restartWatcher('watcher-1743732509429-60jma8x');
```

### Fetch Watcher Status

**Function**: `fetchWatcherStatus()`  
**Method**: GET  
**Endpoint**: `/watchers`  
**Description**: Gets the status of all active watcher processes.

**Response Format**:
```json
{
  "success": true,
  "watchers": [
    {
      "processId": "watcher-1743732509429-60jma8x",
      "folderPath": "/path/to/folder1",
      "projectName": "project-1"
    },
    {
      "processId": "watcher-1743774616080-46i50qc",
      "folderPath": "/path/to/folder2",
      "projectName": "project-2"
    }
  ]
}
```

**Usage Example**:
```typescript
import { fetchWatcherStatus } from '../utils/api';

// Inside async function
const activeWatchers = await fetchWatcherStatus();
console.log(activeWatchers); // Array of watcher objects
```

## Error Handling

The API client includes an interceptor for handling errors:

```typescript
// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Log the error
    logger.error('API Error:', error.message);
    
    // Check if the error is a CORS error
    if (error.message && error.message.includes('Network Error')) {
      // Create a more helpful error message
      error.message = 'Network Error: This may be due to CORS issues. Make sure the watcher API server has CORS enabled and is running.';
    }
    
    return Promise.reject(error);
  }
);
```

Each API function includes try/catch blocks to handle and log errors properly:

```typescript
export const fetchAvailableFolders = async () => {
  try {
    const response = await apiClient.get('/folders');
    return response.data.data;
  } catch (error) {
    logger.error('Error fetching folders:', error);
    throw error;
  }
};
```

## Server-Sent Events API

The dashboard uses Server-Sent Events (SSE) for real-time updates through the `/api/events` endpoint.

### Events Endpoint

**File**: `src/app/api/events/route.ts`  
**Method**: GET  
**Endpoint**: `/api/events`  
**Description**: Establishes an SSE connection and subscribes to Redis channels.

**Implementation**:

```typescript
export async function GET(request: NextRequest) {
  // Create a Redis client for subscribing to channels
  const subscriber = createRedisClient();
  
  // Set up the channels to subscribe to
  const channels = ['watcher.status', 'file.change'];
  
  // Subscribe to the channels
  await Promise.all(channels.map(channel => 
    new Promise((resolve, reject) => {
      subscriber.subscribe(channel, (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    })
  ));
  
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
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    },
  });
}
```

### Client-Side Usage

The `usePersistedEvents` hook connects to the SSE endpoint and manages the event stream:

```typescript
// Inside usePersistedEvents.ts
useEffect(() => {
  let eventSource: EventSource | null = null;
  
  const connectToEvents = () => {
    try {
      // Create a new EventSource connection
      eventSource = new EventSource('/api/events');
      
      // Connection opened
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          const { channel, data } = JSON.parse(event.data);
          
          if (channel === 'watcher.status') {
            // Handle status notification
          } else if (channel === 'file.change') {
            // Handle file change notification
          }
        } catch (parseError) {
          console.error('Error parsing event data:', parseError);
        }
      };
      
      // Error handling and reconnection logic...
    } catch (err) {
      // Error handling...
    }
  };
  
  // Start the connection and cleanup...
});
```

## Redis Integration

The dashboard interacts with Redis through two main interfaces:

1. **Server-side**: Through the SSE API endpoint, which subscribes to Redis channels
2. **Client-side**: Through the `usePersistedEvents` hook, which consumes the SSE events

### Redis Channels

#### watcher.status

```json
{
  "processId": "watcher-1743732509429-60jma8x",
  "status": "shutdown",
  "message": "File watcher closed during server shutdown",
  "timestamp": 1743733477603
}
```

#### file.change

```json
{
  "processId": "watcher-1743774616080-46i50qc",
  "eventType": "change",
  "filePath": "apps/watcher/src/lib/seeder/index.ts",
  "timestamp": 1743774840242
}
```

## API Security Considerations

- The API currently does not implement authentication
- CORS is enabled on the server to allow cross-origin requests from the dashboard
- For production deployment, consider adding:
  - API authentication
  - Rate limiting
  - Request validation
  - HTTPS
