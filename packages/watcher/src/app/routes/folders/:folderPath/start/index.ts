import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import watcherManager from '@/lib/watcher';
import { fileSystemService } from '@carver/shared';
import logger from '@/utils/logger';

const paramsSchema = {
  type: 'object',
  required: ['folderPath'],
  properties: {
    folderPath: { type: 'string' },
  },
};

const queryStringSchema = {
  type: 'object',
  properties: {
    project: { type: 'string' },
  },
};

const responseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      processId: { type: 'string' },
      message: { type: 'string' },
    },
  },
  400: {
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
 * Route handler for starting a file watcher process
 */
export default async function (fastify: FastifyInstance) {
  fastify.post(
    '/:folderPath/start',
    {
      schema: {
        params: paramsSchema,
        querystring: queryStringSchema,
        response: responseSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: { folderPath: string };
        Querystring: { project?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { folderPath } = request.params;

        // Validate folder exists
        if (!fileSystemService.directoryExists(folderPath)) {
          return reply.code(400).send({
            success: false,
            message: `Directory does not exist: ${folderPath}`,
          });
        }

        // Use provided project name or derive from folder path
        const project =
          request.query.project || folderPath.split('/').pop() || 'unnamed-project';

        logger.info(
          `Starting watcher for folder: ${folderPath} with project name: ${project}`
        );

        // Start the file watcher
        const processId = await watcherManager.startWatcher(folderPath, project);

        return reply.code(200).send({
          success: true,
          processId,
          message: `Started file watcher for ${folderPath} with process ID: ${processId}`,
        });
      } catch (error) {
        logger.error('Error starting watcher:', error);
        return reply.code(500).send({
          success: false,
          message: `Error starting watcher: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }
  );
}
