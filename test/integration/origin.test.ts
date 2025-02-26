import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main_ } from '../../scripts/simulateShortcut';
import { chainIdToSimulationRoles } from '../../src/constants';
import { Origin_Wos_Deposit_Shortcut } from '../../src/shortcuts/origin/wos_deposit';
import { Origin_Wos_Redeem_Shortcut } from '../../src/shortcuts/origin/wos_redeem';
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
          shortcut: new Origin_Wos_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main_(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);

      const { amountsIn, dust, quote, weirollWallet, gas } = report[0];

      expect(amountsIn).toEqual(['1000000000000000000']);
      expect(dust[CALLER]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
        '0xb1e25689D55734FD3ffFc939c4C3Eb52DFf8A794': '0',
        '0x9F0dF7799f6FDAd409300080cfF680f5A23df4b1': '0',
      });
      expect(dust[WEIROLL_WALLET]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
        '0xb1e25689D55734FD3ffFc939c4C3Eb52DFf8A794': '0',
        '0x9F0dF7799f6FDAd409300080cfF680f5A23df4b1': '0',
      });
      expect(quote[CALLER]).toEqual({ '0x1d7E3726aFEc5088e11438258193A199F9D5Ba93': '0' });
      expect(quote[WEIROLL_WALLET]).toEqual({ '0x1d7E3726aFEc5088e11438258193A199F9D5Ba93': '987401487320570718999' });
      expect(weirollWallet).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('701297'), BigInt('100'));
    });
  });

  describe('redeems', () => {
    it('wos', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new Origin_Wos_Redeem_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main_(ChainIds.Sonic, txsToSim);
      console.log('Report: ', report);

      // Assert
      expect(report.length).toBe(1);

      const { amountsIn, dust, quote, weirollWallet, gas } = report[0];
      expect(amountsIn).toEqual(['1000000000000000000']);
      expect(dust[WEIROLL_WALLET]).toEqual({
        '0x1d7E3726aFEc5088e11438258193A199F9D5Ba93': '0',
      });
      expect(dust[CALLER]).toEqual({
        '0x1d7E3726aFEc5088e11438258193A199F9D5Ba93': '0',
      });
      expect(quote[WEIROLL_WALLET]).toEqual({ '0x9F0dF7799f6FDAd409300080cfF680f5A23df4b1': '0' });
      expect(quote[CALLER]).toEqual({ '0x9F0dF7799f6FDAd409300080cfF680f5A23df4b1': '1000000000000000' });
      expect(weirollWallet).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('338049'), BigInt('100'));
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
