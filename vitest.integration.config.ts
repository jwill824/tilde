import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts', 'tests/integration/**/*.test.tsx'],
    globals: true,
    environment: 'node',
    testTimeout: 60000,
  },
});
