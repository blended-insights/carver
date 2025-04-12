# File Processing Queue System

This document explains the queue-based file processing system implemented for handling high loads of file upload requests.

## Overview

The system uses Bull (backed by Redis) for queue management and a simple Redis-based locking mechanism to handle the following challenges:

1. **High Request Volume**: Processing multiple file upload requests simultaneously
2. **Race Conditions**: Preventing concurrent modifications to the same file
3. **Resilience**: Handling errors with automatic retries
4. **Monitoring**: Providing visibility into the processing status

## Architecture

The system consists of these main components:

1. **QueueService**: Manages the file processing queue and locking mechanism
2. **POST Endpoint**: Accepts file uploads and queues them for processing
3. **Status Endpoint**: Allows clients to check the status of their uploads

### Request Flow

```
Client -> POST /projects/:projectId/files/:fileId
           -> Queue Job
           -> Return 202 Accepted with Job ID
           -> Background Processing
              -> Acquire Lock
              -> Process File
              -> Release Lock
```

## Endpoints

### Upload a File

```
POST /projects/:projectId/files/:fileId
```

**Request Body:**

```json
{
  "content": "file content here",
  "diskPath": "/optional/path/to/write/to/disk"
}
```

**Response:**

```json
{
  "success": true,
  "message": "File example.js queued for processing",
  "data": {
    "jobId": "123456789",
    "path": "example.js"
  }
}
```

### Check Job Status

```
GET /projects/:projectId/files/:fileId/status/:jobId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "123456789",
    "state": "completed",
    "result": {
      "success": true,
      "projectId": "myproject",
      "fileId": "example.js",
      "hash": "a1b2c3d4...",
      "lastModified": "1612345678901"
    },
    "reason": null,
    "progress": 100,
    "timestamp": 1612345678901,
    "processedOn": 1612345678910,
    "finishedOn": 1612345678920
  }
}
```

## Job States

Bull jobs can be in one of these states:

- **waiting**: Job is waiting to be processed
- **active**: Job is being processed
- **completed**: Job completed successfully
- **failed**: Job failed (may be retried depending on settings)
- **delayed**: Job execution is delayed
- **paused**: Queue is paused
- **stalled**: Job has stalled and will be retried

## Locking Mechanism

The locking system prevents race conditions with these features:

1. Each file gets a unique lock key: `lock:project:{projectId}:file:{fileId}`
2. Before processing, the system acquires a lock with a timeout (5 seconds)
3. After processing, the lock is released (even if an error occurs)
4. If a lock cannot be acquired, the job retries with exponential backoff

### Implementation Details

The locking system uses Redis SET command with `NX` and `PX` options:

- `NX` ensures the key is only set if it doesn't already exist
- `PX` sets an expiration time in milliseconds

When releasing a lock, we use a Lua script to ensure we only delete our own lock:

```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
```

## Error Handling

The queue system includes several error handling mechanisms:

1. **Job Retries**: Failed jobs are retried up to 3 times with exponential backoff
2. **Lock Release**: Locks are always released, even in failure cases
3. **Lock Timeouts**: Locks automatically expire to prevent deadlocks
4. **Failed Job Retention**: Failed jobs are retained for inspection
5. **Logging**: Comprehensive logging of all operations
6. **File Verification**: Verification step after file writing to ensure success

## Sequential Processing

The queue is configured to process jobs sequentially to prevent race conditions:

```typescript
// Set up the processor with concurrency of 1 to ensure jobs run sequentially
this.queue.process(1, this.processJob.bind(this));
```

This ensures that no two jobs are processed simultaneously, further reducing the risk of race conditions.

## Monitoring

Queue statistics can be obtained:

```typescript
const stats = await queueService.getStats();
console.log(stats);
// Output: { waiting: 2, active: 1, completed: 50, failed: 3, delayed: 0 }
```

## Graceful Shutdown

The system properly handles shutdown signals:

1. Stops accepting new requests
2. Allows active jobs to complete
3. Closes queue connections
4. Releases all resources

## Development Guidelines

1. **Avoid Bypassing the Queue**: Always use the queue service for file operations
2. **Monitor Queue Health**: Watch for growing queue sizes or increasing failures
3. **Lock Usage**: Keep processing under locks as short as possible
4. **Error Handling**: Always catch and log errors in queue processors
5. **Verify Writes**: Always verify file writes with an explicit confirmation step
