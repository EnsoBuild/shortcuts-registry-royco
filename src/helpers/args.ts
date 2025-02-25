import { getChainName } from '@ensofinance/shortcuts-builder/helpers';
import { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import os from 'node:os';

import { ForgeTestLogFormat, ForgeTestLogVerbosity, MAX_BPS, ShortcutOutputFormat, SimulationMode } from '../constants';
import type { ShortcutToSimulate, SimulationLogConfig } from '../types';
import { shortcuts, supportedShortcuts } from './shortcuts';
import { getChainId } from './utils';

dotenv.config();

export function validateAndGetSimulationConfig(config?: SimulationLogConfig): SimulationLogConfig {
  const defaultConfig: SimulationLogConfig = {
    forgeTestLogFormat: ForgeTestLogFormat.JSON,
    forgeTestLogVerbosity: ForgeTestLogVerbosity.X4V,
    isForgeTxDataLogged: false,
    isCalldataLogged: false,
    isForgeLogsLogged: false,
    isReportLogged: false,
  };

  if (!config) {
    return defaultConfig;
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

  // Validate `isCalldataLogged`
  if ('isCalldataLogged' in config) {
    if (typeof config.isCalldataLogged !== 'boolean') {
      throw new Error(`Invalid 'isCalldataLogged': ${JSON.stringify(config.isCalldataLogged)}. Must be a boolean`);
    }
  } else {
    config.isCalldataLogged = defaultConfig.isCalldataLogged;
  }

  // Validate `isForgeLogsLogged`
  if ('isForgeLogsLogged' in config) {
    if (typeof config.isForgeLogsLogged !== 'boolean') {
      throw new Error(`Invalid 'isForgeLogsLogged': ${JSON.stringify(config.isForgeLogsLogged)}. Must be a boolean`);
    }
  } else {
    config.isForgeLogsLogged = defaultConfig.isForgeLogsLogged;
  }

  // Validate `isReportLogged`
  if ('isReportLogged' in config) {
    if (typeof config.isReportLogged !== 'boolean') {
      throw new Error(`Invalid 'isReportLogged': ${JSON.stringify(config.isReportLogged)}. Must be a boolean`);
    }
  } else {
    config.isReportLogged = defaultConfig.isReportLogged;
  }

  return config;
}

export function validateAndGetShortcutsToSimulate(txs: ShortcutToSimulate[]): ShortcutToSimulate[] {
  if (!txs.length) throw new Error('Invalid txs array. Must contain at least one tx');

  let prevBlockNumber: BigNumber | undefined;
  let prevBlockTimestamp: number | undefined;

  for (const [index, tx] of txs.entries()) {
    if (!tx.shortcut || !supportedShortcuts.find((shortcut) => tx.shortcut instanceof shortcut)) {
      throw new Error(`Invalid tx at index ${index}: ${JSON.stringify(tx)}. Unsupported 'shortcut'`);
    }
    if (!Array.isArray(tx.amountsIn)) {
      throw new Error(
        `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'amountsIn' must be an array of stringified big numbers`,
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
      tx.blockNumber = currentBlockNumber.toString();

      // NOTE: `blockNumber` must be greater or equal to the last defined one
      if (prevBlockNumber && currentBlockNumber.lt(prevBlockNumber)) {
        throw new Error(
          `Invalid tx at index ${index}: 'blockNumber' (${tx.blockNumber}) is less than previous (${prevBlockNumber.toString()})`,
        );
      }
      prevBlockNumber = currentBlockNumber;

      if ('blockTimestamp' in tx) {
        if (typeof tx.blockTimestamp !== 'number' || tx.blockTimestamp < 0) {
          throw new Error(
            `Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'blockTimestamp' must be a number >= 0`,
          );
        }

        // NOTE: `blockTimestamp` must be greater or equal to the last defined one
        if (prevBlockTimestamp !== undefined && tx.blockTimestamp < prevBlockTimestamp) {
          throw new Error(
            `Invalid tx at index ${index}: 'blockTimestamp' (${tx.blockTimestamp}) is less than previous (${prevBlockTimestamp})`,
          );
        }
        prevBlockTimestamp = tx.blockTimestamp;
      }
    }

    if ('requiresFunding' in tx) {
      if (typeof tx.requiresFunding !== 'boolean') {
        throw new Error(`Invalid tx at index ${index}: ${JSON.stringify(tx)}. 'requiresFunding' must be a boolean`);
      }
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
    }
  }

  return txs;
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

export function getForgePath(): string {
  try {
    const forgePath = execSync(os.platform() === 'win32' ? 'where forge' : 'which forge', { encoding: 'utf-8' }).trim();
    if (!forgePath) {
      throw new Error(`missing 'forge' binary on the system. Make sure 'foundry' is properly installed`);
    }
    return forgePath;
  } catch (error) {
    throw new Error(`Error finding 'forge' binary: ${error}`);
  }
}

export function getSimulationModeFromArgs(args: string[]): SimulationMode {
  const simulationModeIdx = args.findIndex((arg) => arg.startsWith('--mode='));
  let simulationMode: SimulationMode;
  if (simulationModeIdx === -1) {
    simulationMode = SimulationMode.QUOTER;
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
