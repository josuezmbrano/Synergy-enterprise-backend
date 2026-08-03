import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/test/integration/**/*.test.ts', 'src/test/integration/**/*.spec.ts'],
    globalSetup: './src/test/integration/database.setup.ts',
    setupFiles: './src/test/integration/setup.integration.ts',
    fileParallelism: true,
    globals: true,
    environment: 'node',
    exclude: ['src/test/unit/**/*']
  }
});