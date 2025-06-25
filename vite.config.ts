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
      '/api/analyze-concepts': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/analyze-concepts', '/analyze-concepts'),
      },
      '/api/analyze-gaps': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/analyze-gaps', '/analyze-gaps'),
      },
      '/api/find-related-notes': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/find-related-notes', '/find-related-notes'),
      },
      '/api/generate-embedding': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/generate-embedding', '/generate-embedding'),
      },
      '/api/generate-questions': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/generate-questions', '/generate-questions'),
      },
      '/api/review-anwsers': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/review-anwsers', '/review-anwsers'),
      },
      '/api/summarize': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/summarize', '/summarize'),
      },
      '/api/generate-flashcards': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/generate-flashcards', '/generate-flashcards'),
      },
      '/api/generate-study-plan': {
        target: 'https://study.studymindai.me/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/generate-study-plan', '/generate-study-plan'),
      },
    },
  },
});