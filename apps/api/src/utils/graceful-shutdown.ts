import logger from './logger';
import { queueService, redisService } from '@/services';

/**
 * Set up graceful shutdown handlers
 * @param server HTTP server instance
 */
export function setupGracefulShutdown(server: any): void {
  // Function to perform the actual shutdown
  const performShutdown = async () => {
    logger.info('Graceful shutdown initiated');
    
    // Close the server first (stop accepting new requests)
    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      // Close queue connections
      logger.info('Closing queue connections...');
      await queueService.close();
      
      // Close Redis connections
      logger.info('Closing Redis connections...');
      await redisService.close();
      
      logger.info('All connections closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', performShutdown);
  process.on('SIGINT', performShutdown);

  logger.info('Graceful shutdown handlers registered');
}

export default setupGracefulShutdown;
