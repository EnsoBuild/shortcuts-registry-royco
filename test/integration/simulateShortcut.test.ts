import { afterAll, beforeAll, describe, vi } from 'vitest';

describe('Successfully simulates Sonic shortcuts for', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
