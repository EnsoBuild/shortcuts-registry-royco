import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main_ } from '../../scripts/simulateShortcut';
import { Silo_Ws_Deposit_Shortcut } from '../../src/shortcuts/silo/ws_deposit';
import { Silo_Ws_Redeem_Shortcut } from '../../src/shortcuts/silo/ws_redeem';
import { expectBigIntToBeCloseTo } from '../helpers/expects';

describe('silo', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('deposits', () => {
    it('ws', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new Silo_Ws_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main_(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);

      const { amountsIn, dust, quote, weirollWallet, gas } = report[0];
      expect(amountsIn).toEqual(['1000000000000000000']);
      expect(dust).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(quote).toEqual({ '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998149443699976369530' });
      expect(weirollWallet).toBe('0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7');
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('446873'), BigInt('100'));
    });
  });

  describe('redeems', () => {
    it('ws', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new Silo_Ws_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
        {
          shortcut: new Silo_Ws_Redeem_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main_(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);

      const { amountsIn: amountIn1, dust: dust1, quote: quote1, weirollWallet: weirollWallet1, gas: gas1 } = report[1];
      expect(amountIn1).toEqual(['1000000000000000000']);
      expect(dust1).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '-998149443699976369530',
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(quote1).toEqual({ '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '999999999999999999' });
      expect(weirollWallet1).toBe('0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7');
      expectBigIntToBeCloseTo(BigInt(gas1), BigInt('150783'), BigInt('100'));
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
