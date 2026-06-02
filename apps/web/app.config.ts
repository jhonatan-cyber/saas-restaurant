import { defineConfig } from '@tanstack/react-start/config/config';
import tsConfigPaths from 'vite-tsconfig-paths';

/**
 * TanStack Start configuration.
 * Documentación: https://tanstack.com/start/latest/docs/framework/react/overview
 */
export default defineConfig({
  server: {
    port: Number(process.env.WEB_PORT ?? 3000),
    host: '0.0.0.0',
  },
  vite: {
    plugins: () => [
      // Resolución automática de path aliases desde tsconfig
      tsConfigPaths(),
    ],
  },
});
