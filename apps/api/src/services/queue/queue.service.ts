import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';
import path from 'path';

import { RedisCore } from '@/core';
import { fileSystemService } from '@/services';
import logger from '@/utils/logger';

type QueueJobData = {
  projectId: string;
  diskPath: string;
  jobType: 'file' | 'folder';
  timestamp: number;
} & (
  | { jobType: 'file'; fileId: string; content: string }
  | { jobType: 'folder'; folderPath: string }
);

type GetJobReturnType = Job<QueueJobData> | undefined;
type ProcessJobReturnType = Record<string, unknown>;

/**
 * Service to handle file and folder processing queue operations
 * using BullMQ for improved reliability and performance
 */
export class QueueService {
  private queue: Queue<QueueJobData>;
  private worker: Worker<QueueJobData, ProcessJobReturnType>;
  private queueEvents: QueueEvents;
  private redisClient: Redis;

  constructor() {
    const connection = new RedisCore(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    }).getClient();
    this.redisClient = connection;

    const queueName = `file-processing${
      process.env.NODE_ENV === 'development' ? '-dev' : ''
    }`;

    // Initialize the queue
    this.queue = new Queue<QueueJobData>(queueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents(this.queue.name, { connection });

    // Set up the worker with a processor for all job types
    this.worker = new Worker<QueueJobData, ProcessJobReturnType>(
      this.queue.name,
      async (job, token) => {
        console.log('Processing job:', job.id, job.data);
        console.log('Token:', token);
        // Process the job based on its type
        return this.processJob(job);
      },
      {
        connection,
        concurrency: 1,
        lockDuration: 30000,
        stalledInterval: 15000,
      }
    );

    // Set up event handlers
    this.setupEventHandlers();

    // Log queue status on startup
    this.logQueueStatus();

    logger.info('BullMQ processing queue initialized');
  }

  /**
   * Log current queue status for diagnostics
   */
  private async logQueueStatus(): Promise<void> {
    try {
      // Get queue stats
      const stats = await this.getStats();
      logger.info(`Queue status on startup: ${JSON.stringify(stats)}`);

      // Get waiting jobs
      const waitingJobs = await this.queue.getWaiting();
      if (waitingJobs.length > 0) {
        logger.info(`Found ${waitingJobs.length} waiting jobs`);
      }

      // Get active jobs
      const activeJobs = await this.queue.getActive();
      if (activeJobs.length > 0) {
        logger.info(`Found ${activeJobs.length} active jobs`);
      }
    } catch (error) {
      logger.error('Error getting queue status:', error);
    }
  }

  /**
   * Set up event handlers for the queue
   */
  private setupEventHandlers(): void {
    // Worker events
    this.worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });

    this.worker.on('active', ({ id }) => {
      logger.info(`Job ${id} has started processing`);
    });

    this.worker.on('completed', ({ id }, result) => {
      logger.info(`Job ${id} completed with result:`, result);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed:`, error);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} has stalled and will be retried`);
    });

    // Queue events
    this.queueEvents.on('waiting', ({ jobId }) => {
      logger.info(`Job ${jobId} is waiting to be processed`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      logger.info(`Job ${jobId} is now active`);
    });

    this.queueEvents.on('completed', ({ jobId }) => {
      logger.info(`Job ${jobId} has completed`);
    });

    this.queueEvents.on('error', (e) => {
      logger.error(`Queue event error:`, e.message);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job ${jobId} has failed with reason: ${failedReason}`);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      logger.warn(`Job ${jobId} has stalled`);
    });
  }

  /**
   * Direct file write that bypasses the queue system
   * Used as a fallback mechanism for reliability
   */
  private async directFileWrite(
    projectId: string,
    fileId: string,
    content: string,
    diskPath: string
  ): Promise<boolean> {
    try {
      logger.info(`Using direct file write for ${fileId} in ${projectId}`);

      if (!diskPath) {
        logger.error(`No disk path provided for direct file write: ${fileId}`);
        return false;
      }

      const fullPath = path.join(diskPath, fileId);

      // Ensure the directory exists before writing the file
      const dirPath = path.dirname(fullPath);
      await fileSystemService.createDirectory(dirPath);

      // Write file directly
      const writeResult = await fileSystemService.writeFileContent(
        fullPath,
        content
      );

      if (!writeResult) {
        logger.error(`Direct file write failed for ${fileId} at ${fullPath}`);
        return false;
      }

      logger.info(`Direct file write succeeded for ${fileId} at ${fullPath}`);
      return true;
    } catch (error) {
      logger.error(`Error in direct file write:`, error);
      return false;
    }
  }

  /**
   * Add a file processing job to the queue
   * @param projectId Project ID
   * @param fileId File ID
   * @param content file content
   * @param diskPath Optional disk path to write the file
   * @returns Job object
   */
  async addFileJob(
    projectId: string,
    fileId: string,
    content: string,
    diskPath: string
  ): Promise<Job<QueueJobData>> {
    try {
      // Create job data
      const jobData: QueueJobData = {
        projectId,
        fileId,
        content,
        diskPath,
        jobType: 'file',
        timestamp: Date.now(),
      };

      // Add to queue without specific name to avoid the named-job issue
      const job = await this.queue.add('file', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      });

      logger.info(
        `Added file job ${job.id} to queue for ${fileId} in ${projectId}`
      );

      // Check queue health after adding job
      const queueSize = await this.queue.count();
      const activeCount = await this.queue.getActiveCount();

      if (queueSize > 10 || (queueSize > 0 && activeCount === 0)) {
        logger.warn(
          `Queue health check triggered fallback (size: ${queueSize}, active: ${activeCount})`
        );
        await this.directFileWrite(projectId, fileId, content, diskPath);
      }

      return job;
    } catch (error) {
      logger.error(`Error adding file job to queue:`, error);

      // Emergency fallback - if we can't add to queue, try direct write
      await this.directFileWrite(projectId, fileId, content, diskPath);

      throw error;
    }
  }

  /**
   * Add a folder creation job to the queue
   * @param projectId Project ID
   * @param folderPath Folder path to create
   * @param diskPath Base disk path to create the folder
   * @returns Job object
   */
  async addFolderJob(
    projectId: string,
    folderPath: string,
    diskPath: string
  ): Promise<Job<QueueJobData>> {
    try {
      // Create job data
      const jobData: QueueJobData = {
        projectId,
        folderPath,
        diskPath,
        jobType: 'folder',
        timestamp: Date.now(),
      };

      // Add to queue with specific options
      const job = await this.queue.add('folder', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      });

      logger.info(
        `Added folder job ${job.id} to queue for ${folderPath} in ${projectId}`
      );
      return job;
    } catch (error) {
      logger.error(`Error adding folder job to queue:`, error);

      // Emergency fallback - try direct folder creation
      try {
        const fullPath = path.join(diskPath, folderPath);
        await fileSystemService.createDirectory(fullPath);
        logger.info(
          `Direct folder creation succeeded for ${folderPath} at ${fullPath}`
        );
      } catch (directError) {
        logger.error(`Direct folder creation failed:`, directError);
      }

      throw error;
    }
  }

  /**
   * Get a job by ID
   * @param jobId Job ID
   * @returns Job object or null if not found
   */
  async getJob(jobId: string): Promise<GetJobReturnType> {
    try {
      return await this.queue.getJob(jobId);
    } catch (error) {
      logger.error(`Error getting job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Process a job with enhanced error handling and fallback mechanisms
   * @param job BullMQ job object
   * @returns Processing result
   */
  private async processJob(
    job: Job<QueueJobData>
  ): Promise<ProcessJobReturnType> {
    const { projectId, jobType } = job.data;

    logger.info(`Processing job ${job.id} of type ${jobType}`);

    // Update job progress
    await job.updateProgress(10);

    try {
      // Process based on job type
      let result;
      switch (jobType) {
        case 'folder': {
          const { folderPath, diskPath } = job.data;
          await job.updateProgress(30);
          logger.info(`Processing folder job ${job.id} for ${folderPath}`);
          result = await this.processFolderCreation(
            projectId,
            folderPath,
            diskPath
          );
          break;
        }
        case 'file': {
          const { fileId, content, diskPath } = job.data;
          await job.updateProgress(30);
          logger.info(`Processing file write job ${job.id} for ${fileId}`);
          result = await this.processFileWrite(
            projectId,
            fileId,
            content,
            diskPath
          );
          break;
        }
        default:
          throw new Error(`Unsupported job type: ${jobType}`);
      }

      // Log successful completion
      await job.updateProgress(100);
      logger.info(`Job ${job.id} completed successfully`);

      return result;
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error);

      // Check if this is the final retry
      if (job.attemptsMade >= (job.opts.attempts ?? 0) - 1) {
        logger.warn(
          `Final retry failed for job ${job.id}, attempting direct operation`
        );

        // Emergency fallback - attempt direct operation on final retry
        if (jobType === 'file') {
          const { projectId, fileId, content, diskPath } = job.data;
          await this.directFileWrite(projectId, fileId, content, diskPath);
        } else if (jobType === 'folder') {
          const { folderPath, diskPath } = job.data;
          const fullPath = path.join(diskPath, folderPath);
          await fileSystemService.createDirectory(fullPath);
        }
      }

      throw error;
    }
  }

  /**
   * Process a folder creation job
   * @param projectId Project ID
   * @param folderPath Folder path to create
   * @param diskPath Base disk path
   * @returns Processing result
   */
  private async processFolderCreation(
    projectId: string,
    folderPath: string,
    diskPath: string
  ): Promise<Record<string, unknown>> {
    try {
      // Construct the full folder path
      const fullPath = path.join(diskPath, folderPath);

      // Create the directory (recursively if needed)
      const result = await fileSystemService.createDirectory(fullPath);

      if (!result) {
        throw new Error(`Failed to create directory ${folderPath}`);
      }

      logger.info(`Directory ${folderPath} created at ${fullPath}`);

      // Return success with folder metadata
      return {
        success: true,
        projectId,
        folderPath,
        fullPath,
        lastModified: Date.now().toString(),
      };
    } catch (error) {
      logger.error(`Error in folder creation:`, error);
      throw error;
    }
  }

  /**
   * Process a file write job with verification
   * @param projectId Project ID
   * @param fileId File ID
   * @param content the file content
   * @param diskPath Optional disk path
   * @returns Processing result
   */
  private async processFileWrite(
    projectId: string,
    fileId: string,
    content: string,
    diskPath: string
  ): Promise<Record<string, unknown>> {
    try {
      // Calculate hash for the file content
      const hash = fileSystemService.calculateHash(content);

      // Write the file to disk if a path is provided
      if (diskPath) {
        const fullPath = path.join(diskPath, fileId);

        // Ensure the directory exists before writing the file
        const dirPath = path.dirname(fullPath);
        await fileSystemService.createDirectory(dirPath);

        // Write file with explicit retries
        let writeSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!writeSuccess && attempts < maxAttempts) {
          attempts++;

          const writeResult = await fileSystemService.writeFileContent(
            fullPath,
            content
          );

          if (writeResult) {
            // Verify the file was written correctly
            const writtenContent = fileSystemService.readFileContent(fullPath);

            if (writtenContent) {
              const writtenHash =
                fileSystemService.calculateHash(writtenContent);

              if (writtenHash === hash) {
                writeSuccess = true;
                logger.info(
                  `File ${fileId} successfully written and verified at ${fullPath} (attempt ${attempts})`
                );
              } else {
                logger.warn(
                  `File hash mismatch for ${fileId}, retrying (attempt ${attempts})`
                );
              }
            } else {
              logger.warn(
                `Could not read back file ${fileId}, retrying (attempt ${attempts})`
              );
            }
          } else {
            logger.warn(
              `Failed to write file ${fileId}, retrying (attempt ${attempts})`
            );
          }

          if (!writeSuccess && attempts < maxAttempts) {
            // Wait before retrying
            await new Promise((resolve) =>
              setTimeout(resolve, 100 * Math.pow(2, attempts))
            );
          }
        }

        if (!writeSuccess) {
          throw new Error(
            `Failed to write and verify file ${fileId} after ${maxAttempts} attempts`
          );
        }
      } else {
        logger.warn(
          `No disk path provided for file ${fileId}, skipping disk write`
        );
      }

      // Return success with file metadata
      return {
        success: true,
        projectId,
        fileId,
        hash,
        lastModified: Date.now().toString(),
      };
    } catch (error) {
      logger.error(`Error in file write processing:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns Queue statistics object
   */
  async getStats(): Promise<Record<string, number>> {
    try {
      // Get counts for different job states
      const waiting = await this.queue.getWaitingCount();
      const active = await this.queue.getActiveCount();
      const completed = await this.queue.getCompletedCount();
      const failed = await this.queue.getFailedCount();
      const delayed = await this.queue.getDelayedCount();

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanQueue(): Promise<void> {
    try {
      // Clean completed jobs older than 1 hour
      await this.queue.clean(3600000, 0, 'completed');

      // Clean failed jobs older than 24 hours
      await this.queue.clean(86400000, 0, 'failed');

      logger.info('Queue cleaned successfully');
    } catch (error) {
      logger.error('Error cleaning queue:', error);
    }
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    try {
      await this.queue.pause();
      logger.info('Queue paused');
    } catch (error) {
      logger.error('Error pausing queue:', error);
      throw error;
    }
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    try {
      await this.queue.resume();
      logger.info('Queue resumed');
    } catch (error) {
      logger.error('Error resuming queue:', error);
      throw error;
    }
  }

  /**
   * Close the queue, worker, and connections
   */
  async close(): Promise<void> {
    try {
      // Close the worker first
      await this.worker.close();
      logger.info('Worker closed');

      // Close the queue events
      await this.queueEvents.close();
      logger.info('Queue events closed');

      // Close the queue
      await this.queue.close();
      logger.info('Queue closed');

      // Close Redis client
      await this.redisClient.quit();
      logger.info('Redis client closed');

      logger.info('Queue system fully closed');
    } catch (error) {
      logger.error('Error closing queue system:', error);
      throw error;
    }
  }
}

// Export singleton instance
const fileProcessingQueueService = new QueueService();
export default fileProcessingQueueService;
