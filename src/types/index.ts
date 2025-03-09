import { AddressArg, ShortcutMetadata, Transaction, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import type { SimulationMode } from '../constants';
import type { ForgeTestLogFormat, ForgeTestLogJSONTest, ForgeTestLogVerbosity } from '../simulations/forge';
import type { TenderlySimulationResult } from '../simulations/tenderly';

export type HexString = `0x${string}`;

export interface Shortcut {
  name: string;
  description: string;
  supportedChains: number[];
  inputs: Record<number, Input>;
  build(chainId: number, provider: StaticJsonRpcProvider): Promise<Output>;
  getAddressData?(chainId: number): Map<AddressArg, AddressData>;
}

export interface BuiltShortcut {
  script: WeirollScript;
  metadata: ShortcutMetadata;
}

export interface ShortcutToSimulate {
  shortcut: Shortcut;
  amountsIn?: BigNumberish[];
  requiresFunding?: boolean;
  blockNumber?: BigNumberish;
  blockTimestamp?: number;
  trackedAddresses?: AddressArg[];
}

export interface ScenarioToSimulate extends Omit<ShortcutToSimulate, 'shortcut'> {
  shortcut: string;
}

export type Output = {
  script: WeirollScript;
  metadata: ShortcutMetadata;
};

export type RoycoOutput = {
  commands: WeirollScript['commands'];
  state: WeirollScript['state'];
};

export type Input = Record<string, AddressArg>;

export interface SimulationResult {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  logs: any[];
  simulationURL: string;
  transaction: Transaction;
}

export interface SimulationUrlSummary {
  status: boolean;
  url: string;
}

export interface SimulationUrls {
  balancePre: Record<AddressArg, Record<AddressArg, SimulationUrlSummary>>;
  funding: Record<AddressArg, Record<AddressArg, SimulationUrlSummary>>;
  shortcut: SimulationUrlSummary;
  balancePost: Record<AddressArg, Record<AddressArg, SimulationUrlSummary>>;
}

export interface SimulatedShortcutReport {
  isSuccessful?: boolean;
  chainId: number;
  block: {
    number: string;
    timestamp: number;
  };
  shortcutName: string;
  caller: AddressArg;
  weirollWallet: AddressArg;
  amountsIn: string[];
  base?: Record<AddressArg, Record<AddressArg, string>>;
  quote: Record<AddressArg, Record<AddressArg, string>>;
  dust: Record<AddressArg, Record<AddressArg, string>>;
  gas: string;
  simulationUrls?: SimulationUrls;
  rawShortcut?: TenderlySimulationResult | ForgeTestLogJSONTest;
}

export type SimulationReport = SimulatedShortcutReport[];

export interface AddressData {
  address?: AddressArg;
  label: string;
}

export interface SimulationConfig {
  simulationMode: SimulationMode;
  // Forge simulator options
  forgeTestLogFormat?: ForgeTestLogFormat;
  forgeTestLogVerbosity?: ForgeTestLogVerbosity;
  isForgeTxDataLogged?: boolean;
  isForgeLogsLogged?: boolean;
  // Tenderly simulator options
  isTenderlySimulationsLogged?: boolean;
  // Common options
  isCalldataLogged?: boolean;
  isReportLogged?: boolean;
  isRawResultInReport?: boolean;
}

export interface SimulationRoles {
  readonly caller: AddressData;
  readonly recipeMarketHub: AddressData;
  readonly roycoWalletHelpers: AddressData;
  readonly multiCall: AddressData;
  readonly nativeToken: AddressData;
  weirollWallet?: AddressData;
  callee?: AddressData;
  testWeirollWallet?: AddressData;
}

export interface SimulationTokensData {
  tokensIn: AddressArg[];
  tokensInHolders: AddressArg[];
  amountsIn: AddressArg[];
  tokensOut: AddressArg[];
  tokensDust: AddressArg[];
}

export type Campaign = {
  owner: AddressArg;
  verified: boolean;
  numInputTokens: number;
  receiptToken: AddressArg;
  unlockTimestamp: BigNumber;
  depositRecipe: WeirollScript;
};

export type BatchFile = {
  version: string;
  chainId: string;
  createdAt: number;
  meta: {
    name: string;
    description: string;
    txBuilderVersion: string;
    createdFromSafeAddress: string;
    createdFromOwnerAddress: string;
    checksum?: string;
  };
  transactions: SafeTransaction[];
};

export type SafeTransaction = {
  to: string;
  value: string;
  data: string | null;
  contractMethod: Method | null;
  contractInputsValues: Record<string, string> | null;
};

export type Method = {
  name: string;
  inputs: Param[];
  payable: boolean;
};

export type Param = {
  name: string;
  type: string;
  internalType: string;
};
