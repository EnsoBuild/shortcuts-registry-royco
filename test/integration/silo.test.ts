import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main } from '../../scripts/simulateShortcut';
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
          blockNumber: '8455854',
          requiresFunding: true,
          shortcut: new Silo_Ws_Deposit_Shortcut(),
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
      expect(quote).toEqual({ '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '988879598709803129000' });
      expect(weirollWallet).toBe('0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736');
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('366250'), BigInt('100'));
    });
  });

  describe('redeems', () => {
    it('ws', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '8455854',
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
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);

      const { amountsIn: amountIn1, dust: dust1, quote: quote1, weirollWallet: weirollWallet1, gas: gas1 } = report[1];
      expect(amountIn1).toEqual(['1000000000000000000']);
      expect(dust1).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '-998297853831134388682',
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '999999999999999999',
      });
      expect(quote1).toEqual({ '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '999999999999999999' });
      expect(weirollWallet1).toBe('0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736');
      expectBigIntToBeCloseTo(BigInt(gas1), BigInt('150783'), BigInt('100'));
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
