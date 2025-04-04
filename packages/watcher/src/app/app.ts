import { type FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import cors from '@fastify/cors';
import * as path from 'path';
import * as fs from 'fs';

// Import plugins directly for bundled mode
import sensiblePlugin from './plugins/sensible';

// Import routes directly for bundled mode
import rootRoute from './routes/root';
import folderRoute from './routes/folders/index';
import startRoute from './routes/folders/:folderPath/start/index';
import watchersRoute from './routes/watchers/index';
import watcherRoute from './routes/watchers/:processId/index';
import killRoute from './routes/watchers/:processId/kill/index';
import restartRoute from './routes/watchers/:processId/restart/index';

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Register CORS plugin to allow cross-origin requests
  await fastify.register(cors, {
    origin: true, // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Check if we're in bundled mode by looking for specific paths
  const isBundled = !fs.existsSync(path.join(__dirname, 'plugins'));

  if (isBundled) {
    // In bundled mode, register plugins and routes directly
    fastify.register(sensiblePlugin);

    // Register routes
    fastify.register(rootRoute);
    fastify.register(folderRoute, { prefix: '/folders' });
    fastify.register(startRoute, { prefix: '/folders' });
    fastify.register(watchersRoute, { prefix: '/watchers' });
    fastify.register(watcherRoute, { prefix: '/watchers' });
    fastify.register(restartRoute, { prefix: 'watchers' });
    fastify.register(killRoute, { prefix: '/watchers' });
  } else {
    // In non-bundled mode, use autoload
    fastify.register(AutoLoad, {
      dir: path.join(__dirname, 'plugins'),
      options: { ...opts },
    });

    fastify.register(AutoLoad, {
      dir: path.join(__dirname, 'routes'),
      options: { ...opts },
    });
  }
}
