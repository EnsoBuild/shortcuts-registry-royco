import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main_ } from '../../scripts/simulateShortcut';
import { StableJack_PtSts_Deposit_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_deposit';
import { StableJack_PtSts_Redeem_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_redeem';

describe('Successfully simulates Sonic shortcuts for', () => {
  const DEFAULT_ARGS = ['sonic'];

  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('silo', () => {
    it('ws_deposit', async () => {
      // Arrange
      const args = ['silo', 'ws_deposit', parseUnits('1', 18).toString(), '--mode=forge', '--block=8455854'];

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
    it('pt-sts_deposit', async () => {
      // Arrange
      const args = ['stablejack', 'pt-sts_deposit', parseUnits('1', 18).toString(), '--mode=forge', '--block=8865840'];

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

    it('pt-sts_redeem', async () => {
      // Arrange
      const args = ['stablejack', 'pt-sts_redeem', parseUnits('1', 18).toString(), '--mode=forge', '--block=8879851'];

      // Act
      const report = await main_([...DEFAULT_ARGS, ...args]);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        amountsIn: ['1000000000000000000'],
        quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '988965465237611473' },
        dust: {
          '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '0',
        },
        gas: '922643',
      });
    });

    it.only('yt-sts_redeem', async () => {
      // Arrange
      // TODO: validations
      // - In the same chain the blocks can only be equal or move forward, same with timestamp
      const txs = [
        {
          // Rules:
          // 1st tx if no blockNumber -> 'latest'
          // 1st tx if no blockTimestamp -> current
          blockNumber: 8879851,
          shortcut: new StableJack_PtSts_Deposit_Shortcut(),
          amountIn: [parseUnits('1', 18).toString()],
        },
        {
          // Rules:
          // 2nd to N tx, if no blockNumber -> same than previous tx. If blockNumber -> it must be gte previous tx
          // 2nd to N tx, if no blockTimestamp -> same than previous tx. If blockNumber -> it must be gte previous tx
          // N tx is the only one that counts for logging metrics/stats
          blockNumber: undefined,
          blockTimestamp: 1629780000,
          shortcut: new StableJack_PtSts_Redeem_Shortcut(),
          amountIn: [parseUnits('1', 17).toString()],
        },
      ];
      const args = ['stablejack', 'yt-sts_redeem', parseUnits('1', 18).toString(), '--mode=forge', '--block=8879851'];

      // Act
      const report = await main_([...DEFAULT_ARGS, ...args]);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        amountsIn: ['1000000000000000000'],
        quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '988965465237611473' },
        dust: {
          '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '0',
        },
        gas: '922643',
      });
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
