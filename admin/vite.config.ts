import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import { boneyardPlugin } from 'boneyard-js/vite';

export default defineConfig({
  base: '/admin/',
  envDir: '..', // Cargar .env de la raíz del monorepo
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: Number(process.env.ADMIN_PORT ?? 3003),
    host: '0.0.0.0',
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
