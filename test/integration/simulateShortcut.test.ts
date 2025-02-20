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
        amountsIn: ['1000000000000000000'],
        dust: { '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0' },
        quote: { '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998297853831134388682' },
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        gas: '368502',
      });
    });
  });

  describe('stablejack', () => {
    it('pt-sts', async () => {
      // Arrange
      const args = ['stablejack', 'pt-sts', parseUnits('1', 18).toString(), '--mode=forge', '--block=8865840'];

      // Act
      const report = await main_([...DEFAULT_ARGS, ...args]);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        amountsIn: ['1000000000000000000'],
        quote: { '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '999999999999999998' },
        dust: {
          '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
          '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '0',
        },
        gas: '1079475',
      });
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
