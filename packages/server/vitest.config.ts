import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test'
    },
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: ['src/test/integration/**/*']
  },
});