import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main_ } from '../../scripts/simulateShortcut';

describe('Successfully simulates Sonic shortcuts for', () => {
  const DEFAULT_ARGS = ['sonic'];

  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('silo', () => {
    it('ws', async () => {
      // Arrange
      const args = ['silo', 'ws', parseUnits('1', 18).toString(), '--mode=forge', '--block=8455854'];

      // Act
      const report = await main_([...DEFAULT_ARGS, ...args]);

      // Assert
      expect(report).toMatchObject({
        dust: { '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0' },
        quote: { '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998297853831134388682' },
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
      });
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
