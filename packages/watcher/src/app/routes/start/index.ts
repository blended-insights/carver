import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import watcherManager from '@/lib/watcher';
import { fileSystemService } from '@/services';
import logger from '@/utils/logger';

const queryStringSchema = {
  type: 'object',
  required: ['folder'],
  properties: {
    folder: { type: 'string' },
    project: { type: 'string' }
  }
};

const responseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      processId: { type: 'string' },
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
 * Route handler for starting a file watcher process
 */
export default async function (fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      querystring: queryStringSchema,
      response: responseSchema
    }
  }, async (request: FastifyRequest<{
    Querystring: {
      folder: string;
      project?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      const { folder } = request.query;
      
      // Validate folder exists
      if (!fileSystemService.directoryExists(folder)) {
        return reply.code(400).send({
          success: false,
          message: `Directory does not exist: ${folder}`
        });
      }
      
      // Use provided project name or derive from folder path
      const project = request.query.project || folder.split('/').pop() || 'unnamed-project';
      
      logger.info(`Starting watcher for folder: ${folder} with project name: ${project}`);
      
      // Start the file watcher
      const processId = await watcherManager.startWatcher(folder, project);
      
      return reply.code(200).send({
        success: true,
        processId,
        message: `Started file watcher for ${folder} with process ID: ${processId}`
      });
    } catch (error) {
      logger.error('Error starting watcher:', error);
      return reply.code(500).send({
        success: false,
        message: `Error starting watcher: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
}
