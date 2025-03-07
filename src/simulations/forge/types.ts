import { AddressArg } from '@ensofinance/shortcuts-builder/types';

import { ForgeTestLogFormat, ForgeTestLogVerbosity } from './constants';

export interface SimulationForgeData {
  path: string;
  forgeTestLogFormat: ForgeTestLogFormat;
  forgeTestLogVerbosity: ForgeTestLogVerbosity;
  contract: string;
  contractABI: Record<string, unknown>[];
  test: string;
  testRelativePath: string;
}

export interface ShortcutToSimulateForgeData {
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
  trackedAddresses: AddressArg[];
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
