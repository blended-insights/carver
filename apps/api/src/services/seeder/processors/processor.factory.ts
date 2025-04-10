import { FileNode } from '@/interfaces';
import { FileProcessor } from './base.processor';
import { TypeScriptProcessor } from './typescript.processor';
import { FileSystemProcessor } from './file-system.processor';
import { DirectoryProcessor } from './directory.processor';
import logger from '@/utils/logger';

/**
 * Factory class for creating and managing file processors
 */
export class ProcessorFactory {
  private processors: FileProcessor[] = [];
  private fileSystemProcessor: FileSystemProcessor;
  private directoryProcessor: DirectoryProcessor;

  /**
   * Initialize the processor factory with the default processors
   */
  constructor() {
    // Initialize processors in priority order
    this.fileSystemProcessor = new FileSystemProcessor();
    this.directoryProcessor = new DirectoryProcessor(this.fileSystemProcessor);
    
    this.processors = [
      new TypeScriptProcessor(),
      // Add more specialized processors here (e.g., JsonProcessor, MarkdownProcessor)
    ];

    logger.info(`Initialized ProcessorFactory with ${this.processors.length} processors`);
  }

  /**
   * Get processors that can handle a specific file
   * @param file The file to process
   * @returns Array of processors that can handle the file
   */
  getProcessorsForFile(file: FileNode): FileProcessor[] {
    return this.processors.filter(processor => processor.canProcess(file));
  }

  /**
   * Process a file with all applicable processors
   * @param file The file to process
   * @param options Processing options
   * @returns Combined processing result
   */
  async processFile(
    file: FileNode,
    options: {
      projectName: string;
      versionName: string;
      changeType?: 'add' | 'change' | 'unlink';
    }
  ): Promise<{
    success: boolean;
    message: string;
    processedBy: string[];
    failedProcessors?: string[];
  }> {
    // Always process file system structure first
    const fileSystemResult = await this.fileSystemProcessor.processFile(file, options);
    
    if (!fileSystemResult.success && options.changeType !== 'unlink') {
      return {
        success: false,
        message: `Failed to process file system structure: ${fileSystemResult.message}`,
        processedBy: [],
        failedProcessors: ['FileSystemProcessor']
      };
    }

    // For deleted files, we can stop here
    if (options.changeType === 'unlink') {
      return {
        success: true,
        message: `File ${file.path} processed as deleted`,
        processedBy: ['FileSystemProcessor']
      };
    }

    // Find applicable processors
    const applicableProcessors = this.getProcessorsForFile(file);
    logger.debug(`Found ${applicableProcessors.length} processors for file: ${file.path}`);

    if (applicableProcessors.length === 0) {
      return {
        success: true,
        message: `File ${file.path} processed (file system only, no specialized processors)`,
        processedBy: ['FileSystemProcessor']
      };
    }

    // Process the file with each applicable processor
    const results = await Promise.all(
      applicableProcessors.map(async processor => {
        const result = await processor.processFile(file, options);
        return {
          processorName: processor.constructor.name,
          result
        };
      })
    );

    // Collect successful and failed processors
    const successfulProcessors = results
      .filter(r => r.result.success)
      .map(r => r.processorName);

    const failedProcessors = results
      .filter(r => !r.result.success)
      .map(r => r.processorName);

    // Determine overall success
    const success = failedProcessors.length === 0;

    // Compile message
    let message = success
      ? `File ${file.path} successfully processed by all processors`
      : `File ${file.path} partially processed, failed processors: ${failedProcessors.join(', ')}`;

    return {
      success,
      message,
      processedBy: ['FileSystemProcessor', ...successfulProcessors],
      failedProcessors: failedProcessors.length > 0 ? failedProcessors : undefined
    };
  }

  /**
   * Process a directory tree
   * @param dirPath Directory path
   * @param projectRoot Project root directory
   * @param projectName Project name
   */
  async processDirectory(
    dirPath: string,
    projectRoot: string,
    projectName: string
  ): Promise<void> {
    await this.directoryProcessor.processDirectory(dirPath, projectRoot, projectName);
  }

  /**
   * Get the file system processor
   * @returns The file system processor instance
   */
  getFileSystemProcessor(): FileSystemProcessor {
    return this.fileSystemProcessor;
  }

  /**
   * Get the directory processor
   * @returns The directory processor instance
   */
  getDirectoryProcessor(): DirectoryProcessor {
    return this.directoryProcessor;
  }

  /**
   * Register a new processor
   * @param processor The processor to register
   */
  registerProcessor(processor: FileProcessor): void {
    this.processors.push(processor);
    logger.info(`Registered new processor: ${processor.constructor.name}`);
  }
}

// Create singleton instance
export const processorFactory = new ProcessorFactory();
