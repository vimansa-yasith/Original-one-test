import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API + file + admin requests to the Spring Boot backend on :8080.
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://localhost:8080',
    },
  },
});
