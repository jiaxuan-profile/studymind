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
      '/api/generate-embedding': {
        target: 'https://studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/generate-embedding', '/generate-embedding'),
      },
      '/api/analyze-concepts': {
        target: 'https://studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/analyze-concepts', '/analyze-concepts'),
      },
      '/api/summarize': {
        target: 'https://studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/summarize', '/summarize'),
      },
    },
  },
});