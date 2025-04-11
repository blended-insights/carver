import Queue from 'bull';
import logger from '@/utils/logger';
import { fileSystemService } from '@/services';
import path from 'path';

type QueueJobData = {
  projectId: string;
  diskPath: string;
  jobType: 'file' | 'folder';
} & (
  | { jobType: 'file'; fileId: string; content: string }
  | { jobType: 'folder'; folderPath: string }
);

/**
 * Service to handle file and folder processing queue operations
 */
export class QueueService {
  private queue: Queue.Queue;

  constructor(queueName: string) {
    // Initialize the queue
    this.queue = new Queue<QueueJobData>(queueName, {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Set up the processor
    this.queue.process(this.processJob.bind(this));

    // Set up event handlers
    this.setupEventHandlers();

    logger.info('Processing queue initialized');
  }

  /**
   * Set up event handlers for the queue
   */
  private setupEventHandlers(): void {
    this.queue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    this.queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed:`, error);
    });

    this.queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed with result:`, result);
    });
  }

  /**
   * Add a file processing job to the queue
   * @param projectId Project ID
   * @param fileId File ID
   * @param content file content
   * @param diskPath Optional disk path to write the file
   * @param jobType Type of job - only 'write' is fully supported now
   * @returns Job object
   */
  async addFileJob(
    projectId: string,
    fileId: string,
    content: string,
    diskPath: string
  ): Promise<Queue.Job<QueueJobData>> {
    try {
      const job = await this.queue.add({
        projectId,
        fileId,
        content,
        diskPath,
        jobType: 'file',
        timestamp: Date.now(),
      });

      logger.info(
        `Added file job ${job.id} to queue for ${fileId} in ${projectId}`
      );
      return job;
    } catch (error) {
      logger.error(`Error adding file job to queue:`, error);
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
  ): Promise<Queue.Job<QueueJobData>> {
    try {
      const job = await this.queue.add({
        projectId,
        folderPath,
        diskPath,
        jobType: 'folder',
        timestamp: Date.now(),
      });

      logger.info(
        `Added folder job ${job.id} to queue for ${folderPath} in ${projectId}`
      );
      return job;
    } catch (error) {
      logger.error(`Error adding folder job to queue:`, error);
      throw error;
    }
  }

  /**
   * Get a job by ID
   * @param jobId Job ID
   * @returns Job object or null if not found
   */
  async getJob(jobId: string): Promise<Queue.Job | null> {
    try {
      return await this.queue.getJob(jobId);
    } catch (error) {
      logger.error(`Error getting job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Process a job (file or folder operation)
   * @param job Bull job object
   * @returns Processing result
   */
  private async processJob(
    job: Queue.Job<QueueJobData>
  ): Promise<Record<string, unknown>> {
    const { projectId, jobType } = job.data;

    try {
      // Process based on job type
      switch (jobType) {
        case 'folder': {
          const { folderPath, diskPath } = job.data;
          logger.info(`Processing folder job ${job.id} for ${folderPath}`);
          return await this.processFolderCreation(
            projectId,
            folderPath,
            diskPath
          );
        }
        case 'file': {
          const { fileId, content, diskPath } = job.data;
          logger.info(`Processing file write job ${job.id} for ${fileId}`);
          return await this.processFileWrite(
            projectId,
            fileId,
            content,
            diskPath
          );
        }
        default:
          throw new Error(`Unsupported job type: ${jobType}`);
      }
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error);
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
   * Process a file write job
   * This method simply writes the provided content to the file
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
        const writeResult = await fileSystemService.writeFileContent(
          fullPath,
          content
        );

        if (!writeResult) {
          throw new Error(`Failed to write file to disk at ${fullPath}`);
        }

        logger.info(`File ${fileId} written to disk at ${fullPath}`);
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
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Close the queue
   */
  async close(): Promise<void> {
    try {
      await this.queue.close();
      logger.info('Processing queue closed');
    } catch (error) {
      logger.error('Error closing queue:', error);
      throw error;
    }
  }
}

// Export singleton instance
const fileProcessingQueueService = new QueueService('file-processing');
export default fileProcessingQueueService;
