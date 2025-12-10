import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 20000,
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.js'],
    include: ['src/**/*.spec.ts'],
  },
});
