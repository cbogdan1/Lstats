import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev only: forward /api to the local proxy so no CORS is needed. Production sets VITE_API_URL.
    proxy: { '/api': { target: 'http://127.0.0.1:3001', rewrite: (path) => path.slice(4) } },
  },
});
