import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enables global test methods like `describe` and `it`
    environment: 'node', // Use 'jsdom' for browser-like environment
    coverage: {
      reporter: ['text', 'html'], // Coverage reporters
      exclude: ['node_modules'], // Files to exclude
    },
    silent: false, // Suppresses console output
  },
});
