import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

const heliosWebSource = fileURLToPath(new URL('./node_modules/helios-web/src/index.js', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'helios-web': heliosWebSource,
    },
  },
  optimizeDeps: {
    exclude: ['helios-network', 'helios-web'],
  },
});
