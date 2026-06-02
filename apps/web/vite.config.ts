import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/**
 * Vite config explícita (además de app.config.ts).
 * Tener ambas permite invocar `vite` directamente si se necesita.
 */
export default defineConfig({
  server: {
    port: Number(process.env.WEB_PORT ?? 3000),
    host: '0.0.0.0',
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});
