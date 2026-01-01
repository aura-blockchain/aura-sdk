import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/__tests__/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        // Test files and fixtures
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/__tests__/**',
        '**/__fixtures__/**',
        '**/test/**',

        // Benchmark and example files
        '**/benchmarks/**',
        '**/examples/**',
        '**/*-benchmark.ts',
        '**/*-example*.ts',
        '**/example-*.ts',
        '**/example*.ts',

        // Type-only files
        '**/types.ts',
        '**/types/**',

        // Build artifacts
        'dist/**',
        'node_modules/**',
      ],
    },
  },
});
