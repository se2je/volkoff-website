import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const API = process.env.VITE_DEV_API ?? 'http://localhost:4000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/styles/variables.scss" as *;\n`,
        silenceDeprecations: ['import'],
      },
    },
  },
  server: {
    // В dev фронт и API живут на одном origin — как и в проде за nginx
    proxy: {
      '/api': { target: API, changeOrigin: false },
      '/uploads': { target: API, changeOrigin: false },
    },
  },
});
