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

function validateEnum<T>(value: T, validValues: T[], fieldName: string): void {
  if (!validValues.includes(value)) {
    throw new Error(`Invalid '${fieldName}': ${value}. Valid values are: ${validValues.join(', ')}`);
  }
}

function validateBoolean(value: unknown, fieldName: string): void {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid '${fieldName}'. Must be a boolean`);
  }
}

export function validateAndGetSimulationConfig(config?: SimulationConfig): SimulationConfig {
  const defaultConfig: SimulationConfig = {
    simulationMode: SimulationMode.FORGE,
    forgeTestLogFormat: ForgeTestLogFormat.JSON,
    forgeTestLogVerbosity: ForgeTestLogVerbosity.X4V,
    isForgeTxDataLogged: false,
    isForgeLogsLogged: false,
    isTenderlySimulationsLogged: false,
    isCalldataLogged: false,
    isReportLogged: false,
    isRawResultInReport: true,
  };

  // Merge provided config with defaults
  const mergedConfig = { ...defaultConfig, ...config };

  // Validate enum properties
  validateEnum(mergedConfig.simulationMode, supportedSimulationModes, 'simulationMode');
  validateEnum(mergedConfig.forgeTestLogFormat, Object.values(ForgeTestLogFormat), 'forgeTestLogFormat');
  validateEnum(mergedConfig.forgeTestLogVerbosity, Object.values(ForgeTestLogVerbosity), 'forgeTestLogVerbosity');

  // Validate boolean properties
  const booleanFields: (keyof SimulationConfig)[] = [
    'isForgeTxDataLogged',
    'isForgeLogsLogged',
    'isTenderlySimulationsLogged',
    'isCalldataLogged',
    'isReportLogged',
    'isRawResultInReport',
  ];

  booleanFields.forEach((field) => validateBoolean(mergedConfig[field], field));

  return mergedConfig;
}

function validateShortcut(index: number, tx: ShortcutToSimulate): void {
  if (!tx.shortcut || !supportedShortcuts.find((shortcut) => tx.shortcut instanceof shortcut)) {
    throw new Error(`Invalid tx at index ${index}: Unsupported 'shortcut'`);
  }
}

function validateAndSetAmountsIn(index: number, tx: ShortcutToSimulate, isFirstTx: boolean): void {
  if ('amountsIn' in tx) {
    if (!Array.isArray(tx.amountsIn) || tx.amountsIn.length === 0) {
      throw new Error(`Invalid tx at index ${index}: 'amountsIn' must be a non-empty array of stringified big numbers`);
    }

    tx.amountsIn = tx.amountsIn.map((amountIn) => {
      try {
        return BigNumber.from(amountIn).toString();
      } catch {
        throw new Error(`Invalid tx at index ${index}: 'amountsIn' contains an invalid big number: ${amountIn}`);
      }
    });
  } else {
    tx.amountsIn = [];
  }

  if (isFirstTx && tx.amountsIn.length === 0) {
    throw new Error(`Invalid tx at index ${index}: First tx must include 'amountsIn'`);
  }
}

function validateAndSetRequiresFunding(index: number, tx: ShortcutToSimulate, isFirstTx: boolean): void {
  if ('requiresFunding' in tx) {
    if (typeof tx.requiresFunding !== 'boolean') {
      throw new Error(`Invalid tx at index ${index}: 'requiresFunding' must be a boolean`);
    }

    if (tx.requiresFunding && (!Array.isArray(tx.amountsIn) || tx.amountsIn.length === 0)) {
      throw new Error(`Invalid tx at index ${index}: 'amountsIn' is required when 'requiresFunding' is true`);
    }
  } else {
    tx.requiresFunding = false;
  }

  if (isFirstTx && !tx.requiresFunding) {
    throw new Error(`Invalid tx at index ${index}: First tx requireas 'requireFunding' to be true`);
  }
}

function validateAndSetBlockNumber(
  index: number,
  tx: ShortcutToSimulate,
  isFirstTx: boolean,
  latestBlockNumber: BigNumberish,
  prevBlockNumber?: BigNumber,
): void {
  if (!('blockNumber' in tx)) {
    tx.blockNumber = isFirstTx ? BigNumber.from(latestBlockNumber).toString() : prevBlockNumber?.toString();
  }

  let currentBlockNumber: BigNumber;
  try {
    currentBlockNumber = BigNumber.from(tx.blockNumber);
  } catch {
    throw new Error(`Invalid tx at index ${index}: 'blockNumber' contains an invalid big number`);
  }

  if (prevBlockNumber && currentBlockNumber.lt(prevBlockNumber)) {
    throw new Error(
      `Invalid tx at index ${index}: 'blockNumber' (${currentBlockNumber}) must be greater than or equal to previous (${prevBlockNumber})`,
    );
  }
}

async function validateAndSetBlockTimestamp(
  provider: StaticJsonRpcProvider,
  index: number,
  tx: ShortcutToSimulate,
  prevBlockTimestamp?: number,
): Promise<void> {
  if (!('blockTimestamp' in tx)) {
    if ('blockNumber' in tx) {
      const { timestamp } = await provider.getBlock(BigNumber.from(tx.blockNumber).toNumber());
      tx.blockTimestamp = timestamp;
    } else {
      tx.blockTimestamp = prevBlockTimestamp;
    }
  }

  if (typeof tx.blockTimestamp !== 'number' || tx.blockTimestamp < 0) {
    throw new Error(`Invalid tx at index ${index}: 'blockTimestamp' must be a positive number`);
  }

  if (prevBlockTimestamp !== undefined && tx.blockTimestamp < prevBlockTimestamp) {
    throw new Error(
      `Invalid tx at index ${index}: 'blockTimestamp' (${tx.blockTimestamp}) must be >= previous (${prevBlockTimestamp})`,
    );
  }
}

function validateTrackedAddresses(index: number, tx: ShortcutToSimulate): void {
  if (!('trackedAddresses' in tx)) {
    tx.trackedAddresses = [];
  }

  if (!Array.isArray(tx.trackedAddresses)) {
    throw new Error(`Invalid tx at index ${index}: 'trackedAddresses' must be an array`);
  }

  tx.trackedAddresses = tx.trackedAddresses.map((address) => {
    try {
      return getAddress(address) as AddressArg;
    } catch {
      throw new Error(`Invalid tx at index ${index}: 'trackedAddresses' contains an invalid address: ${address}`);
    }
  });
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
    validateShortcut(index, tx);
    validateAndSetAmountsIn(index, tx, index === 0);
    validateAndSetRequiresFunding(index, tx, index === 0);
    validateAndSetBlockNumber(index, tx, index === 0, latestBlockNumber, prevBlockNumber);
    prevBlockNumber = BigNumber.from(tx.blockNumber);
    await validateAndSetBlockTimestamp(provider, index, tx, prevBlockTimestamp);
    prevBlockTimestamp = tx.blockTimestamp;
    validateTrackedAddresses(index, tx);
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
