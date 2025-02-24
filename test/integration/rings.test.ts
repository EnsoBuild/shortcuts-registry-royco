import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main } from '../../scripts/simulateShortcut';
import { Rings_Wstkscusd_Deposit_Shortcut } from '../../src/shortcuts/rings/wstkscusd_deposit';
import { expectBigIntToBeCloseTo } from '../helpers/expects';

describe('rings', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('deposits', () => {
    it('wstkscusd', async () => {
      // Arrange

      const txsToSim = [
        {
          blockNumber: '8455854',
          requiresFunding: true,
          shortcut: new Rings_Wstkscusd_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);

      const { amountsIn, dust, quote, weirollWallet, gas } = report[0];
      expect(amountsIn).toEqual(['1000000000000000000']);
      expect(dust).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(quote).toEqual({ '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE': '988879598709803129000' });
      expect(weirollWallet).toBe('0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736');
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('695271'), BigInt('100'));
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
