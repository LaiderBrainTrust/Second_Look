import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true,
    allowedHosts: process.env.CODESPACES === 'true' && /^[a-z0-9-]+$/.test(process.env.CODESPACE_NAME ?? '') ? [`${process.env.CODESPACE_NAME}-5173.app.github.dev`] : [],
    proxy: { '/api': 'http://127.0.0.1:3001' } },
});
