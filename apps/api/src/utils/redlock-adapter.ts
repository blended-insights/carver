import { Redis } from 'ioredis';
import logger from './logger';

// Type definition for RedLock's expected client eval callback
type RedLockCallback = (err: Error | null, res: any) => void;

/**
 * Adapter class to make ioredis compatible with RedLock
 * This solves the type incompatibility issues between ioredis and redlock
 */
export class RedLockAdapter {
  private redisClient: Redis;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  /**
   * Execute a Lua script on Redis
   * Adapts the ioredis eval method to match what RedLock expects
   */
  eval(args: string[], callback?: RedLockCallback): any {
    try {
      if (!args || args.length < 2) {
        const error = new Error('Invalid arguments for eval');
        if (callback) callback(error, null);
        throw error;
      }
      
      const script = args[0];
      const numkeys = parseInt(args[1], 10);
      const evalArgs = args.slice(2);
      
      // Call the ioredis eval method with the correct argument structure
      return this.redisClient.eval(script, numkeys, ...evalArgs)
        .then(result => {
          if (callback) callback(null, result);
          return result;
        })
        .catch(err => {
          if (callback) callback(err, null);
          throw err;
        });
    } catch (error) {
      logger.error('Error in RedLock adapter eval:', error);
      if (callback) callback(error as Error, null);
      throw error;
    }
  }

  /**
   * Execute a Lua script on Redis with SHA
   * Adapts the ioredis evalsha method to match what RedLock expects
   */
  evalsha(args: string[], callback?: RedLockCallback): any {
    try {
      if (!args || args.length < 2) {
        const error = new Error('Invalid arguments for evalsha');
        if (callback) callback(error, null);
        throw error;
      }
      
      const sha = args[0];
      const numkeys = parseInt(args[1], 10);
      const evalshaArgs = args.slice(2);
      
      // Call the ioredis evalsha method with the correct argument structure
      return this.redisClient.evalsha(sha, numkeys, ...evalshaArgs)
        .then(result => {
          if (callback) callback(null, result);
          return result;
        })
        .catch(err => {
          if (callback) callback(err, null);
          throw err;
        });
    } catch (error) {
      logger.error('Error in RedLock adapter evalsha:', error);
      if (callback) callback(error as Error, null);
      throw error;
    }
  }

  /**
   * Handle Redis client connection events
   */
  on(event: string, listener: (...args: any[]) => void): any {
    return this.redisClient.on(event, listener);
  }
}

/**
 * Create a new RedLock adapter instance
 * @param redisClient ioredis client instance
 * @returns RedLock compatible adapter
 */
export function createRedLockAdapter(redisClient: Redis): any {
  return new RedLockAdapter(redisClient);
}

export default createRedLockAdapter;
