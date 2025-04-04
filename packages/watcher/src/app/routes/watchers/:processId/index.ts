import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import watcherManager from '@/lib/watcher';
import logger from '@/utils/logger';

const paramsSchema = {
  type: 'object',
  required: ['processId'],
  properties: {
    processId: { type: 'string' }
  }
};

const responseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          processId: { type: 'string' },
          folderPath: { type: 'string' },
          projectName: { type: 'string' },
        },
      },
    },
  },
  404: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
  500: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
};

/**
 * Route handler for getting information about a specific watcher process
 */
export default async function (fastify: FastifyInstance) {
  fastify.get(
    '/:processId',
    { 
      schema: { 
        params: paramsSchema,
        response: responseSchema 
      } 
    },
    async (request: FastifyRequest<{
      Params: {
        processId: string;
      }
    }>, reply: FastifyReply) => {
      try {
        const { processId } = request.params;
        
        logger.info(`Getting details for watcher process ID: ${processId}`);
        
        // Get all active watchers
        const watchers = watcherManager.getActiveWatchers();
        
        // Find the specific watcher by its processId
        const watcher = watchers.find(w => w.processId === processId);
        
        if (!watcher) {
          return reply.code(404).send({
            success: false,
            message: `Watcher with process ID ${processId} not found`
          });
        }
        
        return reply.code(200).send({ 
          success: true, 
          data: watcher 
        });
      } catch (error) {
        logger.error('Error getting watcher details:', error);
        return reply.code(500).send({
          success: false,
          message: `Error getting watcher details: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }
  );
}
