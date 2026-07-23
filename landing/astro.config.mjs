import { defineConfig } from 'astro/config';

// @tailwindcss/vite v4.3 is incompatible with Astro 6's bundled Vite.
// Using @tailwindcss/postcss instead (Astro supports PostCSS natively).
// See: https://tailwindcss.com/docs/installation/using-postcss

export default defineConfig({
  output: 'static',
  build: { format: 'directory' },
  server: {
    host: true,
    port: Number(process.env.LANDING_PORT ?? 4321),
  },
  vite: {
    envDir: '..', // Cargar .env de la raíz del monorepo
    server: {
      watch: {
        usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
        interval: 300,
      },
    },
  },
});
