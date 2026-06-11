import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: './vitest.setup.ts',
    // You can add other test configurations here if needed
  },
});
