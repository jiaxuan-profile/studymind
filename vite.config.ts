import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto', 'stream', 'buffer'],
    }),
  ],
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer/',
    },
  },
  define: {
    global: 'globalThis',
  },  
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/', '/api-'),
      },
    },
  },
});