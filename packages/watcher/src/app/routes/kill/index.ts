import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import watcherManager from '@/lib/watcher';
import logger from '@/utils/logger';

const queryStringSchema = {
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
      message: { type: 'string' }
    }
  },
  400: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' }
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
 * Route handler for killing a file watcher process
 */
export default async function (fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      querystring: queryStringSchema,
      response: responseSchema
    }
  }, async (request: FastifyRequest<{
    Querystring: {
      processId: string;
    }
  }>, reply: FastifyReply) => {
    try {
      const { processId } = request.query;
      
      logger.info(`Killing watcher with process ID: ${processId}`);
      
      // Check if the process ID exists
      if (!watcherManager.getActiveWatcherIds().includes(processId)) {
        return reply.code(400).send({
          success: false,
          message: `Process ID ${processId} not found`
        });
      }
      
      // Kill the file watcher
      const killed = await watcherManager.killWatcher(processId);
      
      if (killed) {
        return reply.code(200).send({
          success: true,
          message: `Killed file watcher with process ID: ${processId}`
        });
      } else {
        return reply.code(400).send({
          success: false,
          message: `Failed to kill watcher: Process ID ${processId} not found`
        });
      }
    } catch (error) {
      logger.error('Error killing watcher:', error);
      return reply.code(500).send({
        success: false,
        message: `Error killing watcher: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
}
