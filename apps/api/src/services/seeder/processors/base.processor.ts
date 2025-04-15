import { FileNode } from '@/interfaces';

/**
 * Base interface for file processors
 * This defines the contract that all file processors must implement
 */
export interface FileProcessor {
  /**
   * Check if the processor can handle a specific file
   * @param file The file to check
   * @returns Boolean indicating if the processor can handle the file
   */
  canProcess(file: FileNode): boolean;

  /**
   * Process a file to extract and store entities
   * @param file The file to process
   * @param options Processing options
   * @returns Processing result
   */
  processFile(
    file: FileNode,
    options: {
      projectName: string;
      changeType?: 'add' | 'change' | 'unlink';
    }
  ): Promise<{
    success: boolean;
    message: string;
    processedEntities?: {
      functions?: number;
      classes?: number;
      variables?: number;
      imports?: number;
      exports?: number;
      functionCalls?: number;
    };
  }>;
}
