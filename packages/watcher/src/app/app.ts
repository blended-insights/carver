import { type FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import * as path from 'path';
import * as fs from 'fs';

// Import plugins directly for bundled mode
import sensiblePlugin from './plugins/sensible';

// Import routes directly for bundled mode
import rootRoute from './routes/root';
import folderRoute from './routes/folders/index';
import killRoute from './routes/kill/index';
import restartRoute from './routes/restart/index';
import startRoute from './routes/start/index';
import statusRoute from './routes/status/index';

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Place here your custom code!

  // Check if we're in bundled mode by looking for specific paths
  const isBundled = !fs.existsSync(path.join(__dirname, 'plugins'));

  if (isBundled) {
    // In bundled mode, register plugins and routes directly
    fastify.register(sensiblePlugin);

    // Register routes
    fastify.register(rootRoute);
    fastify.register(folderRoute, { prefix: '/folders' });
    fastify.register(killRoute, { prefix: '/kill' });
    fastify.register(restartRoute, { prefix: '/restart' });
    fastify.register(startRoute, { prefix: '/start' });
    fastify.register(statusRoute, { prefix: '/status' });
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
