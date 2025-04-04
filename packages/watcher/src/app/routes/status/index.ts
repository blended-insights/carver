import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import watcherManager from '@/lib/watcher';
import logger from '@/utils/logger';

const responseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      activeWatchers: { 
        type: 'array',
        items: {
          type: 'object',
          properties: {
            processId: { type: 'string' },
            folderPath: { type: 'string' },
            projectName: { type: 'string' }
          }
        }
      }
    }
  },
  500: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' }
    }
  }
};

/**
 * Route handler for checking status of all file watcher processes
 */
export default async function (fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      response: responseSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Getting status of all watchers');
      
      // Get all active watchers with details
      const activeWatchers = watcherManager.getActiveWatchers();
      
      return reply.code(200).send({
        success: true,
        activeWatchers
      });
    } catch (error) {
      logger.error('Error getting watcher status:', error);
      return reply.code(500).send({
        success: false,
        message: `Error getting watcher status: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
}
