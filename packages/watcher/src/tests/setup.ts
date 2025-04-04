// Jest setup file

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEO4J_URI = 'neo4j://localhost:7687';
process.env.NEO4J_USERNAME = 'neo4j';
process.env.NEO4J_PASSWORD = 'password';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.USER_MOUNT = '/path/to/user/mount';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
