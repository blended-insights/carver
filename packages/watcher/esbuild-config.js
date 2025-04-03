
const { resolve } = require('path');
const fs = require('fs');

/**
 * This module exports plugins for esbuild to handle TypeScript path aliases
 * properly during the build process and to include necessary dependencies.
 */
module.exports = {
  plugins: [
    {
      name: 'alias-paths',
      setup(build) {
        // Handle the @ alias to point to the src directory
        build.onResolve({ filter: /^@\/.*/ }, async (args) => {
          const resolvedPath = args.path.replace(
            /^@\//,
            `${resolve(__dirname, 'src')}/`
          );
          
          return {
            path: resolvedPath,
            external: false,
          };
        });
      },
    },
  ],
};
