import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.js'],
    include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
  },
});
