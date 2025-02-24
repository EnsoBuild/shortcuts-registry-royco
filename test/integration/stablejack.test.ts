import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main } from '../../scripts/simulateShortcut';
import { StableJack_PtSts_Deposit_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_deposit';
import { StableJack_PtSts_Redeem_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_redeem';
import { StableJack_PtWos_Deposit_Shortcut } from '../../src/shortcuts/stablejack/PT-wOS_deposit';
import { StableJack_PtWos_Redeem_Shortcut } from '../../src/shortcuts/stablejack/PT-wOS_redeem';
import { StableJack_YtSts_Deposit_Shortcut } from '../../src/shortcuts/stablejack/YT-stS_deposit';
import { StableJack_YtSts_Redeem_Shortcut } from '../../src/shortcuts/stablejack/YT-stS_redeem';
import { StableJack_YtWos_Deposit_Shortcut } from '../../src/shortcuts/stablejack/YT-wOS_deposit';
import { StableJack_YtWos_Redeem_Shortcut } from '../../src/shortcuts/stablejack/YT-wOS_redeem';
import { getBlockTimestamp, getProviderByChainId } from '../helpers/network';

describe('stablejack', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('deposits', () => {
    it('pt-sts', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new StableJack_PtSts_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);
      expect(report[0]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '999999999999999997' },
        dust: {
          '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
          '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '0',
        },
        gas: '1079923',
      });
    });

    it('pt-wos', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new StableJack_PtWos_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);
      expect(report[0]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0xbe1B1dd422d94f9c1784FB9356ef83A29E1A8cFa': '999999999999999998' },
        dust: {
          '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
        },
        gas: '1345645',
      });
    });

    it('yt-sts', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new StableJack_YtSts_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);
      expect(report[0]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0x0fa31f0d5a574F083E0be272a6CF807270352b3f': '992991794843644995' },
        dust: {
          '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
          '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '0',
        },
        gas: '1326936',
      });
    });

    it('yt-wos', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '8865840',
          requiresFunding: true,
          shortcut: new StableJack_YtWos_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);
      expect(report[0]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0xe16Bb6061B3567ee86285ab7780187cB39aCC55E': '995866865659706485' },
        dust: {
          '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
        },
        gas: '1586184',
      });
    });
  });

  describe('redeems', () => {
    it.skip('pt-sts (standalone)', async () => {
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
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);
      expect(report[0]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '988965465237611473' },
        dust: {
          '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '0',
        },
        gas: '1019484', // '922643',
      });
    });

    it.skip('pt-wos', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '8865840',
          requiresFunding: true,
          shortcut: new StableJack_PtWos_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
        {
          shortcut: new StableJack_PtWos_Redeem_Shortcut(),
          amountsIn: [parseUnits('1', 17).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);
      expect(report[1]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['100000000000000000'],
        quote: { '0xb1e25689D55734FD3ffFc939c4C3Eb52DFf8A794': '-999999999999999998' }, // TODO: 1 wei flicks. Required better assertion
        dust: {
          '0xbe1B1dd422d94f9c1784FB9356ef83A29E1A8cFa': '-999999999999999998', // TODO: 1 wei flicks. Required better assertion
        },
        gas: '546375',
      });
    });

    it.skip('pt-sts', async () => {
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
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);
      expect(report[1]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '988965465237611472' },
        dust: {
          '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '-999999999999999998',
        },
        gas: '587383', // '922643',
      });
    });

    it.skip('yt-sts', async () => {
      // Arrange
      const provider = getProviderByChainId(ChainIds.Sonic);
      const blockNumber = '8865840';
      const blockTimestamp = await getBlockTimestamp(provider, blockNumber);

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
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);
      expect(report[1]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '9889773405810373419' },
        dust: {
          '0x0fa31f0d5a574F083E0be272a6CF807270352b3f': '-9943823683959766112',
        },
        gas: '608649', // '922643',
      });
    });

    it.skip('yt-wos', async () => {
      // Arrange
      const provider = getProviderByChainId(ChainIds.Sonic);
      const blockNumber = '8865840';
      const blockTimestamp = await getBlockTimestamp(provider, blockNumber);

      const txsToSim = [
        {
          blockNumber,
          requiresFunding: true,
          shortcut: new StableJack_YtWos_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
        {
          blockTimestamp: blockTimestamp + 1, // NOTE: YT-wOS cooldown period is 1 second for redeems
          shortcut: new StableJack_YtWos_Redeem_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);
      expect(report[1]).toMatchObject({
        weirollWallet: '0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7',
        amountsIn: ['1000000000000000000'],
        quote: { '0xb1e25689D55734FD3ffFc939c4C3Eb52DFf8A794': '998999999999999998' }, // TODO: 1 wei flicks. Required better assertion
        dust: {
          '0xe16Bb6061B3567ee86285ab7780187cB39aCC55E': '-995866865659706485', // TODO: 1 wei flicks. Required better assertion
        },
        gas: '567861',
      });
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
