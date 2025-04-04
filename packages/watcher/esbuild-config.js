const path = require('path');

/**
 * ESBuild plugin to handle TypeScript path aliases
 */
module.exports = {
  name: 'alias-paths',
  setup(build) {
    // Handle the @ alias to point to the src directory
    build.onResolve({ filter: /^@\/.*/ }, args => {
      const resolvedPath = args.path.replace(
        /^@\//,
        path.resolve(__dirname, 'src') + '/'
      );
      
      return {
        path: resolvedPath,
        external: false,
      };
    });
  }
};
