import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
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