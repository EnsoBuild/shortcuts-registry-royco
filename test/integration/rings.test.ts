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
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new Rings_Wstkscusd_Deposit_Shortcut(),
          amountsIn: [parseUnits('100', 6).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);

      const { amountsIn, dust, quote, weirollWallet, gas } = report[0];
      expect(amountsIn).toEqual(['100000000']);
      expect(dust).toEqual({
        '0x4D85bA8c3918359c78Ed09581E5bc7578ba932ba': '0',
        '0x29219dd400f2Bf60E5a23d13Be72B486D4038894': '0',
        '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE': '0',
      });
      expect(quote).toEqual({ '0x9fb76f7ce5FCeAA2C42887ff441D46095E494206': '100000000' });
      expect(weirollWallet).toBe('0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7');
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('587082'), BigInt('1000'));
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
