import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main_ } from '../../scripts/simulateShortcut';
import { chainIdToSimulationRoles } from '../../src/constants';
import { Silo_Ws_Deposit_Shortcut } from '../../src/shortcuts/silo/ws_deposit';
import { Silo_Ws_Redeem_Shortcut } from '../../src/shortcuts/silo/ws_redeem';
import { expectBigIntToBeCloseTo } from '../helpers/expects';

const CALLER = chainIdToSimulationRoles.get(ChainIds.Sonic)!.caller!.address as AddressArg;
const WEIROLL_WALLET = chainIdToSimulationRoles.get(ChainIds.Sonic)!.testWeirollWallet!.address as AddressArg;

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
      expect(dust[CALLER]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(dust[WEIROLL_WALLET]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(quote[CALLER]).toEqual({ '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '0' });
      expect(quote[WEIROLL_WALLET]).toEqual({ '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998149443699976369530' });
      expect(weirollWallet).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('446834'), BigInt('100'));
    });
  });

  describe('redeems', () => {
    it('ws', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new Silo_Ws_Redeem_Shortcut(),
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
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '0',
      });
      expect(dust[WEIROLL_WALLET]).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '0',
      });
      expect(quote[CALLER]).toEqual({ '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '1001853987207731' });
      expect(quote[WEIROLL_WALLET]).toEqual({ '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0' });
      expect(weirollWallet).toBe('0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7');
      expectBigIntToBeCloseTo(BigInt(gas), BigInt('325386'), BigInt('100'));
    });

    it('ws (deposit-redeem)', async () => {
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
        },
      ];

      // Act
      const report = await main_(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);

      const {
        block: blockSc0,
        amountsIn: amountsInSc0,
        dust: dustSc0,
        quote: quoteSc0,
        weirollWallet: weirollWalletSc0,
        gas: gasSc0,
      } = report[0];

      // Shortcut 0
      expect(blockSc0).toEqual({ number: '9872270', timestamp: 1740423311 });
      expect(amountsInSc0).toEqual(['1000000000000000000']);
      expect(dustSc0[CALLER]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(dustSc0[WEIROLL_WALLET]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(quoteSc0[CALLER]).toEqual({ '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '0' });
      expect(quoteSc0[WEIROLL_WALLET]).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998149443699976369530',
      });
      expect(weirollWalletSc0).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gasSc0), BigInt('446834'), BigInt('100'));

      const {
        amountsIn: amountsInSc1,
        dust: dustSc1,
        quote: quoteSc1,
        weirollWallet: weirollWalletSc1,
        gas: gasSc1,
      } = report[1];

      // Shortcut 1
      expect(blockSc0).toEqual({ number: '9872270', timestamp: 1740423311 });
      expect(amountsInSc1).toEqual(['1000000000000000000']);
      expect(dustSc1[CALLER]).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '0',
      });
      expect(dustSc1[WEIROLL_WALLET]).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '-998149443699976369530',
      });
      expect(quoteSc1[CALLER]).toEqual({ '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '999999999999999999' });
      expect(quoteSc1[WEIROLL_WALLET]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(weirollWalletSc1).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gasSc1), BigInt('174308'), BigInt('100'));
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
