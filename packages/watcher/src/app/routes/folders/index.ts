import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import logger from '@/utils/logger';
import { fileSystemService } from '@/services';

/**
 * Route handler for listing folders from USER_MOUNT environment variable
 */
export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userMount = process.env.USER_MOUNT;
      
      if (!userMount) {
        return reply.code(500).send({
          success: false,
          message: 'USER_MOUNT environment variable is not defined'
        });
      }
      
      // Check if directory exists
      if (!fileSystemService.directoryExists(userMount)) {
        return reply.code(404).send({
          success: false,
          message: `Directory specified in USER_MOUNT does not exist: ${userMount}`
        });
      }
      
      // List all directories
      const folders = fileSystemService.listDirectories(userMount);
      
      return reply.code(200).send({
        success: true,
        data: folders
      });
    } catch (error) {
      logger.error('Error listing folders:', error);
      return reply.code(500).send({
        success: false,
        message: `Error listing folders: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
}
