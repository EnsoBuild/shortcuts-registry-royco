import type { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { BigNumberish } from '@ethersproject/bignumber';

import type { HexString } from '../../types';
import { TenderlySimulationType, TxToSimulationDataType } from './constants';

export interface TenderlyApiCredentials {
  apiKey: string;
  project: string;
  user: string;
}

export type TenderlySimulationCallTrace = {
  contract_name: string;
  function_name: string;
  caller_op: string;
  call_type: string;
  address: AddressArg;
  from: AddressArg;
  from_balance: BigNumberish;
  to: AddressArg;
  to_balance: BigNumberish;
  value: BigNumberish;
  caller: {
    address: AddressArg;
    balance: BigNumberish;
  };
  block_timestamp: string;
  gas: number;
  gas_used: number;
  intrinsic_gas: number;
  refund_gas: number;
  storage_address: HexString;
  input: HexString;
  decoded_input?: {
    soltype: {
      name: string;
      type: string;
      storage_location: string;
      simple_type: {
        type: string;
      };
    };
    value: BigNumberish;
  }[];
  output: HexString;
  decoded_output?: {
    soltype: {
      name: string;
      type: string;
      storage_location: string;
      simple_type: {
        type: string;
      };
    };
    value: BigNumberish;
  }[];
  network_id: number;
};

export type TenderlySimulationStateObjects = Record<
  AddressArg,
  {
    balance?: BigNumberish;
    nonce?: number;
    code?: HexString;
    storage?: Record<HexString, HexString>;
  }
>;

export type TenderlySimulationResult = {
  transaction: {
    error_info: unknown;
    gas_used: number;
    addresses: string[];
    balance_diff: {
      address: AddressArg;
      original: string;
      dirty: string;
      is_miner: boolean;
    }[];
    transaction_info: {
      call_trace: TenderlySimulationCallTrace;
      logs:
        | {
            name: string;
            anonymous: boolean;
            inputs: {
              value: string;
              soltype: {
                name: string;
                type: string;
              };
            }[];
            raw: {
              address: string;
              topics: string[];
              data: string;
            };
          }[]
        | null;
    };
  };
  simulation: {
    ['id']: string;
    project_id: string;
    owner_id: string;
    network_id: number;
    block_number: number;
    transaction_inex: number;
    from: AddressArg;
    to: AddressArg;
    input: HexString;
    gas: number;
    gas_price: BigNumberish;
    gas_used: number;
    value: BigNumberish;
    method: string;
    status: boolean;
    block_header: {
      number: HexString;
      timestamp: HexString;
    };
    state_overrides: TenderlySimulationStateObjects;
    shared: boolean;
    nonce: number;
    addresses: AddressArg[];
    contract_ids: string[];
    created_at: string;
  };
  contracts: {
    id: string;
    address: string;
    contract_name: string;
    token_data?: {
      symbol: string;
      decimal: string;
    };
    standard: string;
    standards: string[];
  }[];
};

export type TenderlySimulationResultProcessed = {
  status: boolean;
  simulationId?: string;
  simulationUrl?: string;
  sharableSimulationUrl?: string;
  blockNumber?: number;
  from?: AddressArg;
  to?: AddressArg;
  value?: BigNumberish;
  gas?: BigNumberish;
  gasPrice?: BigNumberish;
  gasUsed?: BigNumberish;
  chainId: number;
  error?: unknown;
  output?: unknown;
  rawResult?: TenderlySimulationResult;
};

export interface TenderlySimulationBundleResponse {
  simulation_results: TenderlySimulationResult[];
}

export interface TenderlySimulationBlockHeader {
  number?: HexString;
  hash?: HexString;
  stateRoot?: HexString;
  parentHash?: HexString;
  sha3Uncles?: HexString;
  transactionsRoot?: HexString;
  receiptsRoot?: HexString;
  logsBloom?: HexString;
  timestamp?: HexString;
  difficulty?: HexString;
  gasLimit?: HexString;
  gasUsed?: HexString;
  baseFeePerGas?: HexString;
  miner?: HexString;
  extraData?: HexString;
  mixHash?: HexString;
  nonce?: HexString;
  size?: HexString;
  totalDifficulty?: HexString;
  transactions?: HexString[] | null; // NOTE: unclear if `HexString[]` is correct
  uncles?: HexString[] | null; // NOTE: unclear if `HexString[]` is correct
}

// From https://docs.tenderly.co/reference/api#/operations/simulateTransactionBundle#request-body
export interface TenderlySimulation {
  network_id: string;
  save: boolean;
  save_if_fails: boolean;
  simulation_type: TenderlySimulationType;
  from: AddressArg;
  to: AddressArg;
  input: HexString;
  value: string;
  gas?: number;
  block_number?: number;
  block_header?: TenderlySimulationBlockHeader;
  transaction_index?: number;
  state_objects?: Record<AddressArg, TenderlySimulationStateObjects>;
}

export type TxToSimulateTenderlyData =
  | {
      type:
        | TxToSimulationDataType.CALL_BALANCE_POST
        | TxToSimulationDataType.CALL_BALANCE_PRE
        | TxToSimulationDataType.TX_FUNDING
        | TxToSimulationDataType.TX_SHORTCUT;
      simulation: TenderlySimulation;
    }
  | {
      type: TxToSimulationDataType.REPORT;
      tokensIn: AddressArg[];
      amountsIn: string[];
      tokensOut: AddressArg[];
      tokensDust: AddressArg[];
      trackedAddresses: AddressArg[];
    };

export type TxToSimulateTenderlyReportData = Extract<TxToSimulateTenderlyData, { type: TxToSimulationDataType.REPORT }>;

export interface TenderlySimulationBundleRequestPayload {
  simulations: TenderlySimulation[];
}

export interface SimulationIndexData {
  balancePre: number[];
  funding: number[];
  shortcut: number;
  balancePost: number[];
}
