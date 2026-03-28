import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/contract/**/*.test.ts', 'tests/contract/**/*.test.tsx'],
    globals: true,
    environment: 'node',
  },
});
