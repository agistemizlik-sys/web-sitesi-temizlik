import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    cors: true,
    hmr: {
      overlay: true,
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
});
