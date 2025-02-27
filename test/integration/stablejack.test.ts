import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main_ } from '../../scripts/simulateShortcut';
import { chainIdToSimulationRoles } from '../../src/constants';
import { StableJack_PtScusd_Deposit_Shortcut } from '../../src/shortcuts/stablejack/PT-scUSD_deposit';
import { expectBigIntToBeCloseTo } from '../helpers/expects';

const CALLER = chainIdToSimulationRoles.get(ChainIds.Sonic)!.caller!.address as AddressArg;
const WEIROLL_WALLET = chainIdToSimulationRoles.get(ChainIds.Sonic)!.testWeirollWallet!.address as AddressArg;

describe('origin', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('deposits', () => {
    it('wos', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new StableJack_PtScusd_Deposit_Shortcut(),
          amountsIn: [parseUnits('100', 6).toString()],
        },
      ];

      // Act
      const report = await main_(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);

      const { amountsIn, dust, quote, weirollWallet, gas } = report[0];

      expect(amountsIn).toEqual(['100000000']);
      expect(dust[CALLER]).toEqual({
        '0x29219dd400f2Bf60E5a23d13Be72B486D4038894': '0',
      });
      expect(dust[WEIROLL_WALLET]).toEqual({
        '0x29219dd400f2Bf60E5a23d13Be72B486D4038894': '0',
      });
      expect(quote[CALLER]).toEqual({ '0x11d686EF994648Ead6180c722F122169058389ee': '0' });
      expect(quote[WEIROLL_WALLET]).toEqual({ '0x11d686EF994648Ead6180c722F122169058389ee': '987401487320570718999' });
      expect(weirollWallet).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('701297'), BigInt('100'));
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
