import { Transaction } from '@ensofinance/shortcuts-builder/types';
import { BigNumberish } from '@ethersproject/bignumber';
import axios from 'axios';

export const TENDERLY_CONFIG = {
  tenderlyApiKey: process.env.TENDERLY_ACCESS_KEY as string,
  tenderlyProject: process.env.TENDERLY_PROJECT as string,
  tenderlyUser: process.env.TENDERLY_USER as string,
};

export type TenderlyOptions = {
  tenderlyApiKey: string;
  tenderlyUser: string;
  tenderlyProject: string;
  chainId: number;
  saveSimulation?: boolean;
  state_objects?: { [address: string]: object };
};

export type TenderlySimulationCallTrace = {
  call_type: string;
  from: string;
  to: string;
  value?: string;
}[];

export type TenderlyRawSimulationResponse = {
  transaction: {
    error_info: unknown;
    gas_used: number;
    addresses: string[];
    balance_diff: {
      address: string;
      original: string;
      dirty: string;
      is_miner: boolean;
    }[];
    transaction_info: {
      logs: {
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
      }[];
    };
    call_trace: TenderlySimulationCallTrace;
  };
  simulation: {
    network_id: number;
    gas_price: BigNumberish;
    gas: BigNumberish;
    to: string;
    from: string;
    block_number: number;
    id: string;
    status: boolean;
    value: string;
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

export type SimulationResponseTenderly = {
  status: boolean;
  simulationId?: string;
  simulationUrl?: string;
  sharableSimulationUrl?: string;
  blockNumber?: number;
  from?: string;
  to?: string;
  value?: BigNumberish;
  gas?: BigNumberish;
  gasPrice?: BigNumberish;
  gasUsed?: BigNumberish;
  chainId: number;
  error?: unknown;
  rawResponse?: TenderlyRawSimulationResponse;
};

export function prepareTransactionForSimulation(transaction: Transaction, options: TenderlyOptions) {
  const { data, value, from, to } = transaction;

  const transactionReadyForSimulation = {
    network_id: options.chainId,
    from: from,
    to,
    input: data,
    gas: 0,
    gas_price: '0',
    value: value,
    save_if_fails: true,
    save: options.saveSimulation ?? false,
    ...(options.state_objects && { state_objects: options.state_objects }),
  };

  return transactionReadyForSimulation;
}

export async function simulateTransactionOnTenderly(
  transaction: Transaction,
  chainId: number,
): Promise<SimulationResponseTenderly> {
  const options = {
    chainId: chainId,
    ...TENDERLY_CONFIG,
    saveSimulation: true,
  };

  const transactionPreparedToSimulation = prepareTransactionForSimulation(transaction, options);

  try {
    const URL = `https://api.tenderly.co/api/v1/account/${options.tenderlyUser}/project/${options.tenderlyProject}/simulate`;

    const headers = {
      headers: {
        'X-Access-Key': options.tenderlyApiKey,
        'content-type': 'application/JSON',
      },
    };

    const tenderlyResponse = await axios.post(URL, transactionPreparedToSimulation, headers);

    const response = tenderlyResponse.data;

    return tenderlySimulationToResult(response, options);
  } catch (error) {
    const errorResponse = {
      status: false,
      from: transactionPreparedToSimulation.from,
      to: transactionPreparedToSimulation.to,
      gas: transactionPreparedToSimulation.gas,
      gasPrice: transactionPreparedToSimulation.gas_price,
      chainId: options.chainId,
      error,
    };

    if (axios.isAxiosError(error)) {
      errorResponse.error = {
        type: 'Axios Error',
        data: error.response?.data,
      };
    }

    return errorResponse;
  }
}

export function tenderlySimulationToResult(
  response: TenderlyRawSimulationResponse,
  options: TenderlyOptions,
): SimulationResponseTenderly {
  return {
    status: response.simulation.status,
    simulationId: response.simulation.id,
    simulationUrl: `https://dashboard.tenderly.co/${options.tenderlyUser}/${options.tenderlyProject}/simulator/${response.simulation.id}`,
    sharableSimulationUrl: `https://dashboard.tenderly.co/public/${options.tenderlyUser}/${options.tenderlyProject}/simulator/${response.simulation.id}`,
    blockNumber: response.simulation.block_number,
    from: response.simulation.from,
    to: response.simulation.to,
    gas: response.simulation.gas,
    gasUsed: response.transaction.gas_used,
    gasPrice: response.simulation.gas_price,
    value: response.simulation.value,
    chainId: response.simulation.network_id,
    error: response.transaction?.error_info,
    rawResponse: response,
  };
}
