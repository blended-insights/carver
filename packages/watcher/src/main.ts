/* eslint-disable no-inner-declarations */

import Fastify from 'fastify';
import { app } from './app/app';
import watcherManager from './lib/watcher';
import logger from './utils/logger';
import { initializeServices, cleanupServices } from '@carver/shared';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// Main function to start the server
async function startServer() {
  try {
    // Initialize services
    await initializeServices();
    
    // Instantiate Fastify with some config
    const server = Fastify({
      logger: true,
    });

    // Register your application as a normal plugin
    server.register(app);

    // Graceful shutdown handler
    async function closeGracefully(signal: string) {
      logger.info(`Received signal to terminate: ${signal}`);
      
      try {
        // Cleanup all watcher processes
        logger.info('Cleaning up file watchers...');
        await watcherManager.cleanup();
        
        // Cleanup all services
        logger.info('Cleaning up services...');
        await cleanupServices();
        
        // Close the server
        logger.info('Closing server...');
        await server.close();
        
        logger.info('Shutdown complete!');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    }

    // Listen for terminate signals
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));
    process.on('SIGINT', () => closeGracefully('SIGINT'));

    // Start listening
    await server.listen({ port, host });
    logger.info(`[ ready ] Server listening at http://${host}:${port}`);
    
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
