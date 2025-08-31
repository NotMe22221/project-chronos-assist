
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure all packages use the same React instance to prevent hook dispatcher errors
    dedupe: ['react', 'react-dom'],
  },
  // Make sure Vite pre-bundles a single version of React/ReactDOM
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
}));
