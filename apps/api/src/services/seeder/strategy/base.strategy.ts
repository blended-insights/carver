/**
 * Base interface for seeding strategies
 * This defines the contract that all seeding strategies must implement
 */
export interface SeedingStrategy {
  /**
   * Execute the seeding strategy
   * @param options Options for the seeding process
   * @returns Result of the seeding operation
   */
  execute(options: {
    rootPath: string;
    projectName: string;
    versionName: string;
    filePath?: string;
    changeType?: 'add' | 'change' | 'unlink';
  }): Promise<{ success: boolean; message: string }>;
}
