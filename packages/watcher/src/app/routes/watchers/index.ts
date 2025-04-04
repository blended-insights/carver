import { FastifyInstance, FastifyReply } from 'fastify';
import watcherManager from '@/lib/watcher';
import logger from '@/utils/logger';

const responseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            processId: { type: 'string' },
            folderPath: { type: 'string' },
            projectName: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
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
 * Route handler for checking status of all file watcher processes
 */
export default async function (fastify: FastifyInstance) {
  fastify.get(
    '/',
    { schema: { response: responseSchema } },
    async (_, reply: FastifyReply) => {
      try {
        logger.info('Getting status of all watchers');

        // Get all active watchers with details
        const watchers = watcherManager.getActiveWatchers();

        return reply.code(200).send({ success: true, data: watchers });
      } catch (error) {
        logger.error('Error getting watcher status:', error);
        return reply.code(500).send({
          success: false,
          message: `Error getting watcher status: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }
  );
}
