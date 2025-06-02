// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  server: {
    proxy: {
      "/api/generate-embedding": {
        target: "https://studymind-ai.netlify.app/.netlify/functions",
        changeOrigin: true,
        rewrite: (path) => path.replace("/api/generate-embedding", "/generate-embedding")
      },
      "/api/analyze-concepts": {
        target: "https://studymind-ai.netlify.app/.netlify/functions",
        changeOrigin: true,
        rewrite: (path) => path.replace("/api/analyze-concepts", "/analyze-concepts")
      },
      "/api/summarize": {
        target: "https://studymind-ai.netlify.app/.netlify/functions",
        changeOrigin: true,
        rewrite: (path) => path.replace("/api/summarize", "/summarize")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaS9nZW5lcmF0ZS1lbWJlZGRpbmcnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vc3R1ZHltaW5kLWFpLm5ldGxpZnkuYXBwLy5uZXRsaWZ5L2Z1bmN0aW9ucycsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgnL2FwaS9nZW5lcmF0ZS1lbWJlZGRpbmcnLCAnL2dlbmVyYXRlLWVtYmVkZGluZycpLFxuICAgICAgfSxcbiAgICAgICcvYXBpL2FuYWx5emUtY29uY2VwdHMnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vc3R1ZHltaW5kLWFpLm5ldGxpZnkuYXBwLy5uZXRsaWZ5L2Z1bmN0aW9ucycsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgnL2FwaS9hbmFseXplLWNvbmNlcHRzJywgJy9hbmFseXplLWNvbmNlcHRzJyksXG4gICAgICB9LFxuICAgICAgJy9hcGkvc3VtbWFyaXplJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL3N0dWR5bWluZC1haS5uZXRsaWZ5LmFwcC8ubmV0bGlmeS9mdW5jdGlvbnMnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoJy9hcGkvc3VtbWFyaXplJywgJy9zdW1tYXJpemUnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLEVBQzFCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCwyQkFBMkI7QUFBQSxRQUN6QixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsMkJBQTJCLHFCQUFxQjtBQUFBLE1BQ2xGO0FBQUEsTUFDQSx5QkFBeUI7QUFBQSxRQUN2QixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEseUJBQXlCLG1CQUFtQjtBQUFBLE1BQzlFO0FBQUEsTUFDQSxrQkFBa0I7QUFBQSxRQUNoQixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsa0JBQWtCLFlBQVk7QUFBQSxNQUNoRTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
