import { getChainName } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ethersproject/address';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import dotenv from 'dotenv';

import { MAX_BPS, ShortcutOutputFormat, SimulationMode, supportedSimulationModes } from '../constants';
import { ForgeTestLogFormat, ForgeTestLogVerbosity } from '../simulations/forge';
import type { ShortcutToSimulate, SimulationConfig } from '../types';
import { shortcuts, supportedShortcuts } from './shortcuts';
import { getChainId } from './utils';

dotenv.config();

export function validateAndGetSimulationConfig(config?: SimulationConfig): SimulationConfig {
  const defaultConfig: SimulationConfig = {
    simulationMode: SimulationMode.FORGE,
    // Forge simulator options
    forgeTestLogFormat: ForgeTestLogFormat.JSON,
    forgeTestLogVerbosity: ForgeTestLogVerbosity.X4V,
    isForgeTxDataLogged: false,
    isForgeLogsLogged: false,
    // Tenderly simulator options
    isTenderlySimulationsLogged: false,
    // Common options
    isCalldataLogged: false,
    isReportLogged: false,
    isRawResultInReport: true,
  };

  if (!config) {
    return defaultConfig;
  }

  // Validate `simulationMode`
  if (!supportedSimulationModes.includes(config.simulationMode)) {
    throw new Error(
      `Invalid 'simulationMode': ${config.simulationMode}. Supported modes are: ${supportedSimulationModes.join(', ')}`,
    );
  }

  // Validate `forgeTestLogFormat`
  if ('forgeTestLogFormat' in config) {
    if (
      typeof config.forgeTestLogFormat !== 'string' ||
      !Object.values(ForgeTestLogFormat).includes(config.forgeTestLogFormat)
    ) {
      throw new Error(
        `Invalid 'forgeTestLogFormat': ${config.forgeTestLogFormat}. Valid ones are: ${Object.keys(ForgeTestLogFormat).join(', ')}`,
      );
    }
  } else {
    config.forgeTestLogFormat = defaultConfig.forgeTestLogFormat;
  }

  // Validate `forgeTestLogVerbosity`
  if ('forgeTestLogVerbosity' in config) {
    if (
      typeof config.forgeTestLogVerbosity !== 'string' ||
      !Object.values(ForgeTestLogVerbosity).includes(config.forgeTestLogVerbosity)
    ) {
      throw new Error(
        `Invalid 'forgeTestLogVerbosity': ${config.forgeTestLogVerbosity}. Valid ones are: ${Object.values(ForgeTestLogVerbosity).join(', ')}`,
      );
    }
  } else {
    config.forgeTestLogVerbosity = defaultConfig.forgeTestLogVerbosity;
  }

  // Validate `isForgeTxDataLogged`
  if ('isForgeTxDataLogged' in config) {
    if (typeof config.isForgeTxDataLogged !== 'boolean') {
      throw new Error(
        `Invalid 'isForgeTxDataLogged': ${JSON.stringify(config.isForgeTxDataLogged)}. Must be a boolean`,
      );
    }
  } else {
    config.isForgeTxDataLogged = defaultConfig.isForgeTxDataLogged;
  }

  // Validate `isForgeLogsLogged`
  if ('isForgeLogsLogged' in config) {
    if (typeof config.isForgeLogsLogged !== 'boolean') {
      throw new Error(`Invalid 'isForgeLogsLogged': ${JSON.stringify(config.isForgeLogsLogged)}. Must be a boolean`);
    }
  } else {
    config.isForgeLogsLogged = defaultConfig.isForgeLogsLogged;
  }

  // Validate `isTenderlySimulationsLogged`
  if ('isTenderlySimulationsLogged' in config) {
    if (typeof config.isTenderlySimulationsLogged !== 'boolean') {
      throw new Error(
        `Invalid 'isTenderlySimulationsLogged': ${JSON.stringify(config.isTenderlySimulationsLogged)}. Must be a boolean`,
      );
    }
  } else {
    config.isTenderlySimulationsLogged = defaultConfig.isTenderlySimulationsLogged;
  }

  // Validate `isCalldataLogged`
  if ('isCalldataLogged' in config) {
    if (typeof config.isCalldataLogged !== 'boolean') {
      throw new Error(`Invalid 'isCalldataLogged': ${JSON.stringify(config.isCalldataLogged)}. Must be a boolean`);
    }
  } else {
    config.isCalldataLogged = defaultConfig.isCalldataLogged;
  }

  // Validate `isReportLogged`
  if ('isReportLogged' in config) {
    if (typeof config.isReportLogged !== 'boolean') {
      throw new Error(`Invalid 'isReportLogged': ${JSON.stringify(config.isReportLogged)}. Must be a boolean`);
    }
  } else {
    config.isReportLogged = defaultConfig.isReportLogged;
  }

  // Validate `isRawResultInReport`
  if ('isRawResultInReport' in config) {
    if (typeof config.isRawResultInReport !== 'boolean') {
      throw new Error(
        `Invalid 'isRawResultInReport': ${JSON.stringify(config.isRawResultInReport)}. Must be a boolean`,
      );
    }
  } else {
    config.isRawResultInReport = defaultConfig.isRawResultInReport;
  }

  return config;
}

export async function validateAndGetShortcutsToSimulate(
  provider: StaticJsonRpcProvider,
  txs: ShortcutToSimulate[],
): Promise<ShortcutToSimulate[]> {
  if (!txs.length) throw new Error('Invalid txs array. Must contain at least one tx');

  const { number: latestBlockNumber } = await provider.getBlock('latest');

  let prevBlockNumber: BigNumber | undefined;
  let prevBlockTimestamp: number | undefined;

  for (const [index, tx] of txs.entries()) {
    // NOTE: 'shortcut' is required on every item.
    if (!tx.shortcut || !supportedShortcuts.find((shortcut) => tx.shortcut instanceof shortcut)) {
      throw new Error(`Invalid tx at index ${index}: ${JSON.stringify(tx)}. Unsupported 'shortcut'`);
    }

    // NOTE: item at index:
    // - requires: 'amountsIn'
    // - optional: 'blockNumber', 'blockTimestamp', 'requiresFunding', 'trackedAddresses
    if (index === 0) {
      if (!('amountsIn' in tx) || !Array.isArray(tx.amountsIn) || tx.amountsIn.length === 0) {
        throw new Error(
          `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'amountsIn' must be an array of stringified big numbers with at least one element. ` +
            `It is also required in the first shortcut to simulate`,
        );
      }
      tx.requiresFunding = true; // NOTE: makes explicit that the first shortcut requires funding

      if (!('requiresFunding' in tx || typeof tx.requiresFunding !== 'boolean')) {
        throw new Error(
          `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'requiresFunding' must be a boolean. ` +
            `It is also required in the first shortcut to simulate`,
        );
      }
    }

    if ('amountsIn' in tx) {
      if (!Array.isArray(tx.amountsIn) || tx.amountsIn.length === 0) {
        throw new Error(
          `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'amountsIn' must be an array of stringified big numbers with at least one element`,
        );
      }
      const amountsIn: string[] = [];
      for (const amountIn of tx.amountsIn) {
        try {
          BigNumber.from(amountIn);
        } catch (error) {
          console.error(error);
          throw new Error(
            `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'amountsIn' contains an invalid stringified big number: ${JSON.stringify(amountIn)}`,
          );
        }
        amountsIn.push(amountIn.toString());
      }
      tx.amountsIn = amountsIn;
    } else {
      tx.amountsIn = [];
    }

    if ('blockNumber' in tx) {
      let currentBlockNumber: BigNumber;
      try {
        currentBlockNumber = BigNumber.from(tx.blockNumber);
      } catch (error) {
        console.error(error);
        throw new Error(
          `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'blockNumber' contains an invalid stringified big number: ${JSON.stringify(tx.blockNumber)}`,
        );
      }

      // NOTE: `blockNumber` must be greater or equal to the last defined one
      if (prevBlockNumber && currentBlockNumber.lt(prevBlockNumber)) {
        throw new Error(
          `Invalid tx at index ${index}: 'blockNumber' (${currentBlockNumber}) is less than previous (${prevBlockNumber.toString()})`,
        );
      }
      prevBlockNumber = currentBlockNumber;
      tx.blockNumber = prevBlockNumber.toString();
    } else {
      // NOTE: the first tx will have an accurate `blockNumber` if it has not been overridden
      if (index === 0) {
        prevBlockNumber = BigNumber.from(latestBlockNumber.toString());
        tx.blockNumber = prevBlockNumber.toString();
      }
    }

    if ('blockTimestamp' in tx) {
      if (typeof tx.blockTimestamp !== 'number' || tx.blockTimestamp < 0) {
        throw new Error(`Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'blockTimestamp' must be a number >= 0`);
      }

      // NOTE: `blockTimestamp` must be greater or equal to the last defined one
      if (prevBlockTimestamp !== undefined && tx.blockTimestamp < prevBlockTimestamp) {
        throw new Error(
          `Invalid tx at index ${index}: 'blockTimestamp' (${tx.blockTimestamp}) is less than previous (${prevBlockTimestamp})`,
        );
      }
      prevBlockTimestamp = tx.blockTimestamp;
    } else {
      // NOTE: any `blockNumber` without an overridden `blockTimestamp` will fetch the genuine block timestamp.
      if ('blockNumber' in tx) {
        const { timestamp: blockTimestamp } = await provider.getBlock(BigNumber.from(tx.blockNumber!).toNumber());
        prevBlockTimestamp = blockTimestamp;
        tx.blockTimestamp = prevBlockTimestamp;
      }
    }

    if ('requiresFunding' in tx) {
      if (typeof tx.requiresFunding !== 'boolean') {
        throw new Error(`Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'requiresFunding' must be a boolean`);
      }

      if (tx.requiresFunding)
        if (!('amountsIn' in tx) || !Array.isArray(tx.amountsIn) || tx.amountsIn.length === 0) {
          throw new Error(
            `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'amountsIn' must be an array of stringified big numbers with at least one element. ` +
              `It is also required when 'requiresFunding' is present and set to true`,
          );
        }
    } else {
      tx.requiresFunding = false;
    }

    if ('trackedAddresses' in tx) {
      if (!Array.isArray(tx.trackedAddresses)) {
        throw new Error(
          `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'trackedAddresses' must be an array of addresses`,
        );
      }
      const checksumAddresses: AddressArg[] = [];
      for (const address of tx.trackedAddresses) {
        let checksumAddress: AddressArg;
        try {
          checksumAddress = getAddress(address) as AddressArg;
        } catch {
          throw new Error(
            `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'trackedAddresses' contains an invalid address: ${address}`,
          );
        }
        checksumAddresses.push(checksumAddress);
      }
      tx.trackedAddresses = checksumAddresses;
    } else {
      tx.trackedAddresses = [];
    }
  }

  return txs;
}

// NOTE: any `simulations` item on the POST Tenderly Bundle API payload that lacks a `blockNumber`
// will be executed on the latest chain block. Therefore it is important to populate missing `blockNumber`
// for each shortcut to simulate. `blockTimestamp` is also populated for convenience.
export function populateMissingBlockData(txsToSim: ShortcutToSimulate[]): ShortcutToSimulate[] {
  let lastBlockNumber: BigNumberish | undefined = txsToSim[0].blockNumber;
  let lastBlockTimestamp: number | undefined = txsToSim[0].blockTimestamp;

  return txsToSim.map((txToSim, index) => {
    if (index > 0) {
      if (txToSim.blockNumber === undefined) {
        txToSim = { ...txToSim, blockNumber: lastBlockNumber };
      }
      if (txToSim.blockTimestamp === undefined) {
        txToSim = { ...txToSim, blockTimestamp: lastBlockTimestamp };
      }
    }

    lastBlockNumber = txToSim.blockNumber;
    lastBlockTimestamp = txToSim.blockTimestamp;
    return txToSim;
  });
}

export async function getShortcut(args: string[]) {
  if (args.length < 3) throw 'Error: Please pass chain, protocol, and market';
  const chain = args[0];
  const protocol = args[1];
  const market = args[2];

  const chainId = getChainId(chain);
  if (!chainId) throw 'Error: Unknown chain';

  const shortcut = shortcuts[protocol]?.[market];
  if (!shortcut) throw 'Error: Unknown shortcut';

  return { shortcut, chainId };
}

export function getRpcUrlByChainId(chainId: number): string {
  const chainName = getChainName(chainId);

  const rpcUrl = process.env[`RPC_URL_${chainName.toUpperCase()}`];
  if (!rpcUrl) throw new Error(`Missing 'RPC_URL_${chainName.toUpperCase()}' environment variable`);

  return rpcUrl;
}

export function getSimulationModeFromArgs(args: string[]): SimulationMode {
  const simulationModeIdx = args.findIndex((arg) => arg.startsWith('--mode='));
  let simulationMode: SimulationMode;
  if (simulationModeIdx === -1) {
    simulationMode = SimulationMode.TENDERLY;
  } else {
    simulationMode = args[simulationModeIdx].split('=')[1] as SimulationMode;
    args.splice(simulationModeIdx, 1);
  }
  return simulationMode;
}

export function getBlockNumberFromArgs(args: string[]): number {
  const blockNumberIdx = args.findIndex((arg) => arg.startsWith('--block='));
  let blockNumber: number;
  if (blockNumberIdx === -1) {
    blockNumber = blockNumberIdx;
  } else {
    blockNumber = parseInt(args[blockNumberIdx].split('=')[1]);
    args.splice(blockNumberIdx, 1);
  }

  return blockNumber;
}

export function getPrivateKeyFromArgs(args: string[]): string {
  const privateKeyIdx = args.findIndex((arg) => arg.startsWith('--privateKey='));
  let privateKey: string;
  if (privateKeyIdx === -1) {
    // get env variable
    privateKey = process.env.PRIVATE_KEY as string;
    if (!privateKey) throw 'Error: Env variable not found';
  } else {
    privateKey = args[privateKeyIdx].split('=')[1];
    args.splice(privateKeyIdx, 1);
  }

  return privateKey;
}

export function getShortcutOutputFormatFromArgs(args: string[]): string {
  const outputFmtIdx = args.findIndex((arg) => arg.startsWith('--output='));
  let outputFmt: string;
  if (outputFmtIdx === -1) {
    outputFmt = ShortcutOutputFormat.ROYCO;
  } else {
    outputFmt = args[outputFmtIdx].split('=')[1] as ShortcutOutputFormat;
    args.splice(outputFmtIdx, 1);
  }

  return outputFmt;
}

export function getAmountsInFromArgs(args: string[]): string[] {
  const filteredArg = args[3];
  if (!filteredArg || !filteredArg.length) throw 'Error: Please pass amounts (use commas for multiple values)';

  return filteredArg.split(',');
}

export function getBasisPointsFromArgs(args: string[], label: string, defaultVal: string): BigNumber {
  const idx = args.findIndex((arg) => arg.startsWith(`--${label}=`));
  let raw: string;
  if (idx === -1) {
    raw = defaultVal;
  } else {
    raw = args[idx].split('=')[1] as ShortcutOutputFormat;
    args.splice(idx, 1);
  }

  let value: BigNumber;
  try {
    value = BigNumber.from(raw);
  } catch (error) {
    throw new Error(`Invalid ${label}: ${raw}. Required a BigNumber type as BIPS. Reason: ${error}`);
  }

  if (value.lt(0) || value.gt(MAX_BPS)) {
    throw new Error(`invalid ${label}: ${raw}. BIPS is out of range [0,${MAX_BPS.toString()}]`);
  }

  return value;
}

export function getIsCalldataLoggedFromArgs(args: string[]): boolean {
  const logCalldataIdx = args.findIndex((arg) => arg.startsWith('--calldata'));
  let isCalldataLogged: boolean;
  if (logCalldataIdx === -1) {
    isCalldataLogged = false;
  } else {
    isCalldataLogged = true;
    args.splice(logCalldataIdx, 1);
  }

  return isCalldataLogged;
}

export function getWalletFromArgs(args: string[]): string {
  const filteredArgs = args.slice(5);
  if (filteredArgs.length != 1) throw 'Error: Please pass wallet address';

  const address = filteredArgs[0];

  if (!address.startsWith('0x') || address.length !== 42) throw 'Error: Invalid address';

  return address;
}
