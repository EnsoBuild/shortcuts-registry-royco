import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { parseUnits } from '@ethersproject/units';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main } from '../../scripts/simulateShortcut';
import { Silo_Ws_Deposit_Shortcut } from '../../src/shortcuts/silo/ws_deposit';
import { StableJack_PtSts_Deposit_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_deposit';
import { StableJack_PtSts_Redeem_Shortcut } from '../../src/shortcuts/stablejack/PT-stS_redeem';

// import { StableJack_YtSts_Redeem_Shortcut } from '../../src/shortcuts/stablejack/YT-stS_redeem';

describe('Successfully simulates Sonic shortcuts for', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('silo PoC', () => {
    it('ws_deposit', async () => {
      // Arrange
      const txsToSim = [
        {
          // blockNumber: '8455854',
          requiresFunding: true,
          shortcut: new Silo_Ws_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
        // {
        //   blockNumber: '8455855',
        //   blockTimestamp: 1739890000,
        //   shortcut: new Silo_Ws_Deposit_Shortcut(),
        //   amountsIn: [parseUnits('2', 18).toString()],
        // },
        // {
        //   shortcut: new Silo_Ws_Deposit_Shortcut(),
        //   amountsIn: [parseUnits('3', 18).toString()],
        // },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

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

  // describe('silo', () => {
  //   it('ws_deposit', async () => {
  //     // Arrange
  //     const args = ['silo', 'ws_deposit', parseUnits('1', 18).toString(), '--mode=forge', '--block=8455854'];

  //     // Act
  //     const report = await main_([...DEFAULT_ARGS, ...args]);

  //     // Assert
  //     expect(report).toMatchObject({
  //       amountsIn: ['1000000000000000000'],
  //       dust: { '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0' },
  //       quote: { '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998297853831134388682' },
  //       weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
  //       gas: '368502',
  //     });
  //   });
  // });

  // describe('stablejack', () => {
  //   it('pt-sts_deposit', async () => {
  //     // Arrange
  //     const args = ['stablejack', 'pt-sts_deposit', parseUnits('1', 18).toString(), '--mode=forge', '--block=8865840'];

  //     // Act
  //     const report = await main_([...DEFAULT_ARGS, ...args]);

  //     // Assert
  //     expect(report).toMatchObject({
  //       weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
  //       amountsIn: ['1000000000000000000'],
  //       quote: { '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '999999999999999998' },
  //       dust: {
  //         '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
  //         '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '0',
  //       },
  //       gas: '1079475',
  //     });
  //   });

  //   it('pt-sts_redeem', async () => {
  //     // Arrange
  //     const args = ['stablejack', 'pt-sts_redeem', parseUnits('1', 18).toString(), '--mode=forge', '--block=8879851'];

  //     // Act
  //     const report = await main_([...DEFAULT_ARGS, ...args]);

  //     // Assert
  //     expect(report).toMatchObject({
  //       weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
  //       amountsIn: ['1000000000000000000'],
  //       quote: { '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955': '988965465237611473' },
  //       dust: {
  //         '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c': '0',
  //       },
  //       gas: '922643',
  //     });
  //   });

  it('pt-sts_redeem', async () => {
    // Arrange
    // TODO: validations
    // - In the same chain the blocks can only be equal or move forward, same with timestamp
    const blockNumber = 8865840;
    const txsToSim = [
      {
        blockNumber,
        shortcut: new StableJack_PtSts_Deposit_Shortcut(),
        amountsIn: [parseUnits('1', 18).toString()],
        requiresFunding: true,
      },
      {
        blockNumber: blockNumber,
        shortcut: new StableJack_PtSts_Redeem_Shortcut(),
        amountsIn: [parseUnits('1', 20).toString()],
        requiresFunding: false,
      },
    ];

    // Act
    const report = await main(ChainIds.Sonic, txsToSim);

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
  // });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
