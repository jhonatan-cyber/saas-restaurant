import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.output'],
    server: {
      deps: {
        inline: ['react', 'react-dom'],
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      react: resolve(__dirname, '../node_modules/react'),
      'react-dom': resolve(__dirname, '../node_modules/react-dom'),
      '@saas/shared': resolve(__dirname, '../packages/shared/src/index.ts'),
      '@saas/shared/*': resolve(__dirname, '../packages/shared/src/*'),
    },
  },
});
