# Troubleshooting the File Processing Queue

This document provides guidance for diagnosing and resolving common issues with the queuing system.

## Common Issues

### Queue Not Processing Jobs

If jobs are being added to the queue but not being processed:

**Potential causes:**

- Redis connection issues
- Bull worker processes not running
- Error in the job processor function

**Solutions:**

1. Check Redis connectivity: `redis-cli ping` should return `PONG`
2. Examine logs for queue errors
3. Inspect queue status:
   ```typescript
   const stats = await queueService.getStats();
   console.log(stats);
   ```
4. Try manually processing a job:
   ```typescript
   const job = await queueService.getJob(jobId);
   if (job) {
     const result = await queueService.processFileJob(job);
     console.log(result);
   }
   ```

### High Memory Usage

If the application is using excessive memory:

**Potential causes:**

- Too many jobs in the queue
- Large file content being stored in memory
- Memory leaks in the job processing cycle

**Solutions:**

1. Limit the number of concurrent jobs:
   ```typescript
   this.fileQueue = new Queue('file-processing', {
     // Add concurrency limiter
     limiter: {
       max: 5,
       duration: 1000,
     },
   });
   ```
2. Implement streaming for large files instead of loading entire content in memory
3. Set appropriate job cleanup options:
   ```typescript
   defaultJobOptions: {
     removeOnComplete: {
       age: 3600, // Remove completed jobs after 1 hour
       count: 100  // Keep only the latest 100 completed jobs
     }
   }
   ```

## Monitoring the Queue

To monitor the queue health:

1. **Real-time Stats:**

   ```typescript
   const stats = await queueService.getStats();
   ```

2. **Active Job Information:**

   ```typescript
   const activeJobs = await fileQueue.getActive();
   console.log(`Currently processing ${activeJobs.length} jobs`);
   ```

3. **Failed Job Analysis:**
   ```typescript
   const failedJobs = await fileQueue.getFailed();
   for (const job of failedJobs) {
     console.log(`Job ${job.id} failed: ${job.failedReason}`);
   }
   ```

## Queue Maintenance

### Cleaning Up Failed Jobs

```typescript
await fileQueue.clean(24 * 3600 * 1000, 'failed'); // Clean failed jobs older than 24 hours
```

### Resetting the Queue

```typescript
await fileQueue.empty(); // Remove all jobs from the queue
```

### Forcing Stuck Jobs to Complete

```typescript
const stuckJobs = await fileQueue.getStalled();
for (const job of stuckJobs) {
  await job.moveToCompleted('manually completed', 'stuck');
}
```

## Graceful Shutdown

Ensure proper shutdown by calling:

```typescript
await queueService.close();
```

This will:

1. Wait for active jobs to complete
2. Stop accepting new jobs
3. Close the Redis connections
4. Release all resources
