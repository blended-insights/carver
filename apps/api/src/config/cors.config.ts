// apps/api/src/config/cors.config.ts
import { CorsOptions } from 'cors';

// List of allowed origins
const allowedOrigins = {
  development: [
    'http://localhost:3000', // Local web app
  ],
  production: [
    'http://localhost:9002', // Docker web app
    'https://your-production-domain.com',
  ],
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Get the current environment
    const env = process.env.NODE_ENV || 'development';

    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if the origin is allowed for the current environment
    if (
      allowedOrigins[env as keyof typeof allowedOrigins].indexOf(origin) !== -1
    ) {
      return callback(null, true);
    }

    // Otherwise, reject the request
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
