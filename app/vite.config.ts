import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import { boneyardPlugin } from 'boneyard-js/vite';

/**
 * Vite config (TanStack Start plugin en lugar de Vinxi).
 * Migrado de app.config.ts (TanStack Start ≤ 1.130) al Vite plugin nativo (≥ 1.131).
 */
export default defineConfig({
  base: '/',
  envDir: '..', // Cargar .env de la raíz del monorepo
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: Number(process.env.APP_PORT ?? 3000),
    host: '0.0.0.0',
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
      interval: 300,
    },
    // Proxy para que las requests al API sean same-origin
    // Necesario para que las cookies HttpOnly funcionen en desarrollo.
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    boneyardPlugin({ out: './src/bones' }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
