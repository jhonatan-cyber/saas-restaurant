import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  build: { format: 'directory' },
  vite: { plugins: [tailwind()] },
});
