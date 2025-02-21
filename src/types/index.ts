import {
  AddressArg,
  ShortcutMetadata,
  Transaction,
  WeirollScript,
} from "@ensofinance/shortcuts-builder/types";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import type { ForgeTestLogFormat } from "../constants";

export interface Shortcut {
  name: string;
  description: string;
  supportedChains: number[];
  inputs: Record<number, Input>;
  build(chainId: number, provider: StaticJsonRpcProvider): Promise<Output>;
  getAddressData?(chainId: number): Map<AddressArg, AddressData>;
  getTokenHolder?(chainId: number): Map<AddressArg, AddressArg>;
}

export interface BuiltShortcut {
  script: WeirollScript;
  metadata: ShortcutMetadata;
}

export interface TransactionToSimulate {
  shortcut: Shortcut;
  amountsIn: BigNumberish[];
  requiresFunding?: boolean;
  blockNumber?: BigNumberish;
  blockTimestamp?: number;
}

export interface TransactionToSimulateForgeData {
  shortcutName: string;
  blockNumber: number;
  blockTimestamp: number;
  txData: string;
  txValue: string;
  tokensIn: AddressArg[];
  tokensInHolders: AddressArg[];
  amountsIn: string[];
  // NOTE: `requiresFunding` triggers the logic that funds the wallet with each `tokensIn` and `amountsIn`.
  // 1st tx probably requires it set to `true`. If further txs have it set to `true` as well it may
  // skew the simulation results (e.g., tokens dust amounts). Use it thoughtfully.
  requiresFunding: boolean;
  tokensOut: AddressArg[];
  tokensDust: AddressArg[];
}

export type Output = {
  script: WeirollScript,
  metadata: ShortcutMetadata,
}

export type RoycoOutput = {
  weirollCommands: WeirollScript['commands'];
  weirollState: WeirollScript['state'];
}

export type Input = Record<string, AddressArg>;

export interface SimulationResult {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  logs: any[];
  simulationURL: string;
  transaction: Transaction;
}

export type Report = {
  weirollWallet: AddressArg;
  amountsIn: string[];
  quote: Record<string, string>;
  dust: Record<string, string>;
  gas: string;
};

export interface AddressData {
  address?: AddressArg;
  label: string;
}

export interface SimulationLogConfig {
  isReportLogged: boolean;
  isCalldataLogged: boolean;
}

export interface SimulationRoles {
  readonly caller: AddressData;
  readonly recipeMarketHub: AddressData;
  readonly roycoWalletHelpers: AddressData;
  readonly multiCall: AddressData;
  readonly nativeToken: AddressData;
  weirollWallet?: AddressData;
  callee?: AddressData;
}

export interface SimulationForgeData {
  path: string;
  forgeTestLogFormat: ForgeTestLogFormat
  contract: string;
  contractABI: Record<string, unknown>[];
  test: string;
  testRelativePath: string;
}

export interface SimulationTokensData {
  tokensIn: AddressArg[];
  tokensInHolders: AddressArg[];
  amountsIn: AddressArg[];
  tokensOut: AddressArg[];
  tokensDust: AddressArg[];
}

export interface ForgeTestLogJSONTest {
  duration: { secs: number; nanos: number };
  test_results: {
    [test: string]: {
      status: string;
      reason: null | string;
      counterexample: null | string;
      logs: {
        address: AddressArg;
        topics: string[];
        data: string;
      }[];
      decoded_logs: string[];
      labeled_addresses: Record<AddressArg, string>;
    };
  };
}

export interface ForgeTestLogJSON {
  [path: string]: ForgeTestLogJSONTest;
}

export type Campaign = {
  owner: AddressArg;
  verified: boolean;
  numInputTokens: number;
  receiptToken: AddressArg;
  unlockTimestamp: BigNumber;
  depositRecipe: WeirollScript;
}

export type BatchFile = {
    version: string,
    chainId: string,
    createdAt: number,
    meta: {
        name: string,
        description: string,
        txBuilderVersion: string,
        createdFromSafeAddress: string,
        createdFromOwnerAddress: string,
        checksum?: string,
    },
    transactions: SafeTransaction[],
}

export type SafeTransaction = {
    to: string;
    value: string;
    data: string | null;
    contractMethod: Method | null;
    contractInputsValues: Record<string, string> | null;
}

export type Method = {
  name: string,
  inputs: Param[],
  payable: boolean,
}

export type Param = {
  name: string,
  type: string,
  internalType: string,
}
