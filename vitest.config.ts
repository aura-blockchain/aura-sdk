import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types.ts',
        '**/*.config.ts',
        '**/index.ts',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    include: ['packages/**/src/**/*.{test,spec}.ts', 'packages/**/__tests__/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@aura-network/verifier-sdk-core': path.resolve(__dirname, './packages/core/src'),
    },
  },
});
