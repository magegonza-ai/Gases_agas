import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.jsx'],
    include: ['src/**/*.test.{js,jsx}'],
    globals: true,
    css: true,
  },
});