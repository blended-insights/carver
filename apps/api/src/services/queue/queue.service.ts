import Queue from 'bull';
import logger from '@/utils/logger';
import { fileSystemService } from '@/services';
import path from 'path';
// import RedLock from 'redlock';

/**
 * Service to handle file and folder processing queue operations
 */
export class QueueService {
  private fileQueue: Queue.Queue;
  // private redlock: RedLock;

  constructor(queueName = 'file-processing') {
    // Initialize the queue
    this.fileQueue = new Queue(queueName, {
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

    // this.redlock = new RedLock([this.fileQueue.client], {
    //   driftFactor: 0.01,
    //   retryCount: 10,
    //   retryDelay: 200,
    //   retryJitter: 200,
    // });

    // Set up the processor
    this.fileQueue.process(this.processJob.bind(this));

    // Set up event handlers
    this.setupEventHandlers();

    logger.info('Processing queue initialized');
  }

  /**
   * Set up event handlers for the queue
   */
  private setupEventHandlers(): void {
    this.fileQueue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    this.fileQueue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed:`, error);
    });

    this.fileQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed with result:`, result);
    });
  }

  /**
   * Add a file processing job to the queue
   * @param projectId Project ID
   * @param fileId File ID
   * @param content File content or object containing oldText/newText for replacement
   * @param diskPath Optional disk path to write the file
   * @param jobType Type of job (write or replace)
   * @returns Job object
   */
  async addFileJob(
    projectId: string,
    fileId: string,
    content: string,
    diskPath?: string,
    jobType: 'write' | 'replace' = 'write'
  ): Promise<Queue.Job> {
    try {
      const job = await this.fileQueue.add({
        projectId,
        fileId,
        content,
        diskPath,
        jobType,
        timestamp: Date.now(),
      });

      logger.info(
        `Added ${jobType} job ${job.id} to queue for ${fileId} in ${projectId}`
      );
      return job;
    } catch (error) {
      logger.error(`Error adding ${jobType} job to queue:`, error);
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
  ): Promise<Queue.Job> {
    try {
      const job = await this.fileQueue.add({
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
      return await this.fileQueue.getJob(jobId);
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
  private async processJob(job: Queue.Job): Promise<Record<string, any>> {
    const {
      projectId,
      jobType = 'write',
    } = job.data;
    
    try {
      // Process based on job type
      if (jobType === 'replace') {
        const { fileId, content, diskPath } = job.data;
        logger.info(`Processing replace job ${job.id} for ${fileId}`);
        return await this.processTextReplacement(
          projectId,
          fileId,
          content,
          diskPath
        );
      } else if (jobType === 'folder') {
        const { folderPath, diskPath } = job.data;
        logger.info(`Processing folder job ${job.id} for ${folderPath}`);
        return await this.processFolderCreation(
          projectId,
          folderPath,
          diskPath
        );
      } else {
        // Default to write operation
        const { fileId, content, diskPath } = job.data;
        logger.info(`Processing write job ${job.id} for ${fileId}`);
        return await this.processFileWithLock(
          projectId,
          fileId,
          content,
          diskPath
        );
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
  ): Promise<Record<string, any>> {
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
   * Process a text replacement job
   * @param projectId Project ID
   * @param fileId File ID
   * @param contentJson JSON string containing oldText and newText
   * @param diskPath Optional disk path
   * @returns Processing result
   */
  private async processTextReplacement(
    projectId: string,
    fileId: string,
    contentJson: string,
    diskPath?: string
  ): Promise<Record<string, any>> {
    try {
      // Parse the content JSON to get oldText and newText
      const { oldText, newText } = JSON.parse(contentJson);

      if (!oldText || !newText) {
        throw new Error(
          'Invalid replacement data: oldText and newText are required'
        );
      }

      if (!diskPath) {
        throw new Error(
          'Disk path is required for text replacement operations'
        );
      }

      // Construct the full file path
      const fullPath = path.join(diskPath, fileId);

      // Perform the text replacement
      const result = await fileSystemService.replaceTextInFile(
        fullPath,
        oldText,
        newText
      );

      if (!result.success) {
        throw new Error(`Failed to replace text in file ${fileId}`);
      }

      // Calculate hash for the updated content
      const hash = fileSystemService.calculateHash(result.content || '');

      // Return success with file metadata
      return {
        success: true,
        projectId,
        fileId,
        hash,
        lastModified: Date.now().toString(),
      };
    } catch (error) {
      logger.error(`Error in text replacement processing:`, error);
      throw error;
    }
  }

  /**
   * Process a file with lock held
   * @param projectId Project ID
   * @param fileId File ID
   * @param content File content
   * @param diskPath Optional disk path
   * @returns Processing result
   */
  private async processFileWithLock(
    projectId: string,
    fileId: string,
    content: string,
    diskPath?: string
  ): Promise<Record<string, any>> {
    try {
      // Calculate hash for the file content
      const hash = fileSystemService.calculateHash(content);

      // Store file data in Redis
      // await redisService.storeFileData(projectId, fileId, content, hash);
      // logger.info(`Stored file ${fileId} in Redis for project ${projectId}`);

      // Write the file to disk if a path is provided
      if (diskPath) {
        const fullPath = path.join(diskPath, fileId);
        const writeResult = await fileSystemService.writeFileContent(
          fullPath,
          content
        );

        if (!writeResult) {
          logger.warn(`Failed to write file to disk at ${fullPath}`);
        } else {
          logger.info(`File ${fileId} written to disk at ${fullPath}`);
        }
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
      logger.error(`Error in file processing:`, error);
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
        this.fileQueue.getWaitingCount(),
        this.fileQueue.getActiveCount(),
        this.fileQueue.getCompletedCount(),
        this.fileQueue.getFailedCount(),
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
      await this.fileQueue.close();
      logger.info('Processing queue closed');
    } catch (error) {
      logger.error('Error closing queue:', error);
      throw error;
    }
  }
}

// Export singleton instance
const queueService = new QueueService();
export default queueService;