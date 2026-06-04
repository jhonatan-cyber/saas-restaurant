import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import tsConfigPaths from 'vite-tsconfig-paths';

/**
 * Vite config (TanStack Start plugin en lugar de Vinxi).
 * Migrado de app.config.ts (TanStack Start ≤ 1.130) al Vite plugin nativo (≥ 1.131).
 */
export default defineConfig({
  base: '/app/',
  server: {
    port: Number(process.env.WEB_PORT ?? 3000),
    host: '0.0.0.0',
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
  ],
});
