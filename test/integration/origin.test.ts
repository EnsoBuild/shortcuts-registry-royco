import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main } from '../../scripts/simulateShortcut';
import { ForgeTestLogFormat } from '../../src/constants';
import { Origin_Wos_Deposit_Shortcut } from '../../src/shortcuts/origin/wos_deposit';
import { Origin_Wos_Redeem_Shortcut } from '../../src/shortcuts/origin/wos_redeem';
import { expectBigIntToBeCloseTo } from '../helpers/expects';
import { getBlockTimestamp, getProviderByChainId } from '../helpers/network';

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
          shortcut: new Origin_Wos_Deposit_Shortcut(),
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
        '0xb1e25689D55734FD3ffFc939c4C3Eb52DFf8A794': '0',
        '0x9F0dF7799f6FDAd409300080cfF680f5A23df4b1': '0',
      });
      expect(quote).toEqual({ '0x1d7E3726aFEc5088e11438258193A199F9D5Ba93': '987401487320570718999' });
      expect(weirollWallet).toBe('0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7');
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('701297'), BigInt('100'));
    });
  });

  describe('redeems', () => {
    it('wos', async () => {
      // Arrange
      const provider = getProviderByChainId(ChainIds.Sonic);
      const blockNumber = '9872270';
      const blockTimestamp = await getBlockTimestamp(provider, blockNumber);

      const txsToSim = [
        {
          blockNumber,
          requiresFunding: true,
          shortcut: new Origin_Wos_Deposit_Shortcut(),
          amountsIn: [parseUnits('10', 18).toString()],
        },
        {
          blockTimestamp: blockTimestamp + 1,
          shortcut: new Origin_Wos_Redeem_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim, { forgeTestLogFormat: ForgeTestLogFormat.DEFAULT });
      console.log('Report: ', report);

      // Assert
      expect(report.length).toBe(2);
      process.stdout.write(JSON.stringify(report, null, 2));

      const { amountsIn: amountIn1, dust: dust1, quote: quote1, weirollWallet: weirollWallet1, gas: gas1 } = report[1];
      expect(amountIn1).toEqual(['1000000000000000000']);
      expect(dust1).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '-998297853831134388682',
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '999999999999999999',
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
