import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main } from '../../scripts/simulateShortcut';
import { ForgeTestLogFormat } from '../../src/constants';
import { getRpcUrlByChainId } from '../../src/helpers';
import { Silo_Ws_Deposit_Shortcut } from '../../src/shortcuts/silo/ws_deposit';
import { StableJack_PtSts_Deposit_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_deposit';
import { StableJack_PtSts_Redeem_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_redeem';
import { StableJack_YtSts_Deposit_Shortcut } from '../../src/shortcuts/stablejack/YT-stS_deposit';
import { StableJack_YtSts_Redeem_Shortcut } from '../../src/shortcuts/stablejack/YT-stS_redeem';

export async function getBlockTimestamp(provider: StaticJsonRpcProvider, blockNumber: BigNumberish): Promise<number> {
  const block = await provider.getBlock(Number(blockNumber));
  if (!block) throw new Error(`Block ${blockNumber} not found`);
  return block.timestamp;
}

export function getProviderByChainId(chainId: ChainIds): StaticJsonRpcProvider {
  const rpcUrl = getRpcUrlByChainId(chainId);
  return new StaticJsonRpcProvider({
    url: rpcUrl,
  });
}

describe('Successfully simulates Sonic shortcuts for', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('silo', () => {
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
        const report = await main(ChainIds.Sonic, txsToSim, { forgeTestLogFormat: ForgeTestLogFormat.JSON });

        // Assert
        expect(report.length).toBe(1);
        expect(report[0]).toMatchObject({
          amountsIn: ['1000000000000000000'],
          dust: { '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0' },
          quote: { '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998297853831134388682' },
          weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
          gas: '417625', // '368502',
        });
      });
    });
  });

  describe('stablejack', () => {
    describe('deposits', () => {
      it('pt-sts', async () => {
        // Arrange
        const txsToSim = [
          {
            blockNumber: '8865840',
            requiresFunding: true,
            shortcut: new StableJack_PtSts_Deposit_Shortcut(),
            amountsIn: [parseUnits('1', 18).toString()],
          },
        ];

        // Act
        const report = await main(ChainIds.Sonic, txsToSim, { forgeTestLogFormat: ForgeTestLogFormat.JSON });

        // Assert
        expect(report.length).toBe(1);
        expect(report[0]).toMatchObject({
          weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
          amountsIn: ['1000000000000000000'],
          quote: { '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '999999999999999998' },
          dust: {
            '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
            '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '0',
          },
          gas: '1178484', // '1079475',
        });
      });

      it('yt-sts', async () => {
        // Arrange
        const txsToSim = [
          {
            blockNumber: '8865840',
            requiresFunding: true,
            shortcut: new StableJack_YtSts_Deposit_Shortcut(),
            amountsIn: [parseUnits('1', 18).toString()],
          },
        ];

        // Act
        const report = await main(ChainIds.Sonic, txsToSim, { forgeTestLogFormat: ForgeTestLogFormat.JSON });

        // Assert
        expect(report.length).toBe(1);
        expect(report[0]).toMatchObject({
          weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
          amountsIn: ['1000000000000000000'],
          quote: { '0x0fa31f0d5a574F083E0be272a6CF807270352b3f': '994382368395976610' },
          dust: {
            '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
            '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '0',
          },
          gas: '1431815',
        });
      });
    });

    describe('redeems', () => {
      it('pt-sts (standalone)', async () => {
        // Arrange
        const txsToSim = [
          {
            blockNumber: '8879851',
            requiresFunding: true,
            shortcut: new StableJack_PtSts_Redeem_Shortcut(),
            amountsIn: [parseUnits('1', 18).toString()],
          },
        ];

        // Act
        const report = await main(ChainIds.Sonic, txsToSim, { forgeTestLogFormat: ForgeTestLogFormat.JSON });

        // Assert
        expect(report.length).toBe(1);
        expect(report[0]).toMatchObject({
          weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
          amountsIn: ['1000000000000000000'],
          quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '988965465237611473' },
          dust: {
            '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '0',
          },
          gas: '1019484', // '922643',
        });
      });

      it('pt-sts', async () => {
        // Arrange
        const txsToSim = [
          {
            blockNumber: '8879851',
            requiresFunding: true,
            shortcut: new StableJack_PtSts_Deposit_Shortcut(),
            amountsIn: [parseUnits('1', 18).toString()],
          },
          {
            shortcut: new StableJack_PtSts_Redeem_Shortcut(),
            amountsIn: [parseUnits('1', 18).toString()],
          },
        ];

        // Act
        const report = await main(ChainIds.Sonic, txsToSim, { forgeTestLogFormat: ForgeTestLogFormat.JSON });

        // Assert
        expect(report.length).toBe(2);
        expect(report[1]).toMatchObject({
          weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
          amountsIn: ['1000000000000000000'],
          quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '988965465237611472' },
          dust: {
            '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '-999999999999999998',
          },
          gas: '587383', // '922643',
        });
      });

      it('yt-sts', async () => {
        const provider = getProviderByChainId(ChainIds.Sonic);
        const blockNumber = '8865840';
        const blockTimestamp = await getBlockTimestamp(provider, blockNumber);

        // Arrange
        const txsToSim = [
          {
            blockNumber,
            requiresFunding: true,
            shortcut: new StableJack_YtSts_Deposit_Shortcut(),
            amountsIn: [parseUnits('10', 18).toString()],
          },
          {
            blockTimestamp: blockTimestamp + 1, // NOTE: YT-stS cooldown period is 1 second for redeems
            shortcut: new StableJack_YtSts_Redeem_Shortcut(),
            amountsIn: [parseUnits('1', 18).toString()],
          },
        ];

        // Act
        const report = await main(ChainIds.Sonic, txsToSim, { forgeTestLogFormat: ForgeTestLogFormat.JSON });

        // Assert
        expect(report.length).toBe(2);
        expect(report[1]).toMatchObject({
          weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
          amountsIn: ['1000000000000000000'],
          quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '9889773405810373419' },
          dust: {
            '0x0fa31f0d5a574F083E0be272a6CF807270352b3f': '-9943823683959766112',
          },
          gas: '608649', // '922643',
        });
      });
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
