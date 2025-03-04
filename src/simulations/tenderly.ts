import { Transaction } from '@ensofinance/shortcuts-builder/types';
import type { AddressArg, BytesArg, ChainIds, FromContractCallArg } from '@ensofinance/shortcuts-builder/types';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import axios from 'axios';

import { DEFAULT_TX_AMOUNT_IN_VALUE } from '../constants';
import { getEncodedDataErc20Transfer } from '../helpers';
import { getEncodedData } from '../helpers';
import { getAmountInForNativeToken } from '../helpers/simulations';
import type {
  BuiltShortcut,
  ShortcutToSimulate,
  SimulationLogConfig,
  SimulationReport,
  SimulationRoles,
} from '../types';

export enum TenderlySimulationType {
  ABI = 'abi',
  FULL = 'full',
  QUICK = 'quick',
}

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

export type TenderlySimulationStateObjects = Record<
  AddressArg,
  {
    balance?: string;
    nonce?: number;
    code?: string;
    storage?: Record<Exclude<BytesArg, FromContractCallArg>, Exclude<BytesArg, FromContractCallArg>>;
  }
>;

// From https://docs.tenderly.co/reference/api#/operations/simulateTransactionBundle#request-body
export interface TenderlySimulation {
  network_id: string;
  save: boolean;
  save_if_fails: boolean;
  simulation_type: TenderlySimulationType;
  from: AddressArg;
  to: AddressArg;
  input: Exclude<BytesArg, FromContractCallArg>;
  value: string;
  gas?: number;
  block_number?: number;
  transaction_index?: number;
  state_objects?: Record<AddressArg, TenderlySimulationStateObjects>;
}
export interface TenderlySimulateBundledTxsPayload {
  simulations: TenderlySimulation[];
  blockNumber?: number;
}

function* getTxToSimulateTenderlyData(
  chainId: ChainIds,
  txIndex: number,
  txToSim: ShortcutToSimulate,
  builtShortcut: BuiltShortcut,
  nativeToken: AddressArg,
  tokenToHolder: Map<AddressArg, AddressArg>,
  addressToLabel: Map<AddressArg, string>,
  roles: SimulationRoles,
): Generator<TenderlySimulation> {
  const { tokensIn } = builtShortcut.metadata as { tokensIn: AddressArg[]; tokensOut: AddressArg[] };
  const amountsIn = txToSim.amountsIn.map((amountIn) => amountIn.toString());

  // Yield a simulation that funds caller tokenIn (but not native token)
  if (txToSim.requiresFunding) {
    for (let i = 0; i < (tokensIn as AddressArg[]).length; i++) {
      const holder = tokenToHolder.get(tokensIn[i]);
      if (!holder) {
        throw new Error(
          `simulateOnTenderly: no holder found for token: ${tokensIn[i]} (${addressToLabel.get(tokensIn[i])}). ` +
            `If it is missing by mistake, please add it into 'chainIdToTokenHolder' map`,
        );
      }
      const token = tokensIn[i];
      if (token.toLowerCase() === nativeToken.toLowerCase()) continue;

      const txData = getEncodedDataErc20Transfer(roles.caller.address!, amountsIn[i]);

      yield {
        network_id: chainId.toString(),
        save: true,
        save_if_fails: true,
        simulation_type: TenderlySimulationType.FULL,
        from: holder,
        to: token,
        input: txData as Exclude<BytesArg, FromContractCallArg>,
        value: '0',
        block_number: 9872270,
        state_objects: {
          [holder as AddressArg]: {
            balance: BigNumber.from('10').pow(18).toString(), // 1 ETH
          },
        } as TenderlySimulationStateObjects,
      };
    }
  }

  // Yield a simulation that executes the shortcut
  const { commands, state } = builtShortcut.script;
  const txData = getEncodedData(commands, state) as Exclude<BytesArg, FromContractCallArg>;
  const txValue = getAmountInForNativeToken(nativeToken, tokensIn, txToSim.amountsIn) || DEFAULT_TX_AMOUNT_IN_VALUE;

  console.log(`*** tokensIn`, tokensIn);
  console.log(`*** txValue`, txValue);

  const state_objects: TenderlySimulationStateObjects = {};
  // NOTE: fund the caller address
  if (txIndex === 0 && !state_objects[roles.caller.address!]?.balance) {
    state_objects[roles.caller.address!] = {
      balance: BigNumber.from('1000').pow(18).toString(), // 1000 ETH
    };
  }

  yield {
    network_id: chainId.toString(),
    save: true,
    save_if_fails: true,
    simulation_type: TenderlySimulationType.FULL,
    from: roles.caller.address!,
    to: roles.callee!.address!,
    input: txData as Exclude<BytesArg, FromContractCallArg>,
    value: txValue,
    block_number: 9872270,
    state_objects,
  };
}

export async function simulateShortcutsWithTenderlyAndGenerateReport(
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
  txsToSim: ShortcutToSimulate[],
  builtShortcuts: BuiltShortcut[],
  roles: SimulationRoles,
  tokenToHolder: Map<AddressArg, AddressArg>,
  addressToLabel: Map<AddressArg, string>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  simulationLogConfig: SimulationLogConfig,
): Promise<SimulationReport> {
  const nativeToken = roles.nativeToken.address as AddressArg;
  const simulations: TenderlySimulation[] = [];

  for (const [index, txToSim] of txsToSim.entries()) {
    const simulationGenerator = getTxToSimulateTenderlyData(
      chainId,
      index,
      txToSim,
      builtShortcuts[index],
      nativeToken,
      tokenToHolder,
      addressToLabel,
      roles,
    );

    // Collect all simulations from the generator
    for (const simulation of simulationGenerator) {
      simulations.push(simulation);
    }
  }
  console.log(JSON.stringify(simulations, null, 2));
  const payload: TenderlySimulateBundledTxsPayload = {
    simulations,
    blockNumber: 9872270,
  }; // TODO
  const results = await simulateShorcutsOnTenderly(payload, chainId);
  results.forEach((result) => {
    console.log('*** Tenderly simulation URL', JSON.stringify(result.sharableSimulationUrl));
  });

  // @ts-expect-error TODO: VN
  return {};
}

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

// TODO: VN

export function getTxToSimulate() {
  return {
    network_id: '1',
    save: true,
    save_if_fails: true,
    simulation_type: 'full',
  };
}

export async function simulateShorcutsOnTenderly(
  payload: TenderlySimulateBundledTxsPayload,
  chainId: number,
): Promise<SimulationResponseTenderly[]> {
  const options = {
    chainId: chainId,
    ...TENDERLY_CONFIG,
    saveSimulation: true,
  };

  const URL = `https://api.tenderly.co/api/v1/account/${options.tenderlyUser}/project/${options.tenderlyProject}/simulate-bundle`;
  const requestConfig = {
    headers: {
      Accept: 'application/json',
      'Content-type': 'application/json',
      'X-Access-Key': options.tenderlyApiKey,
    },
  };

  // TODO: VN
  try {
    const tenderlyResponse = await axios.post(URL, payload, requestConfig);

    const response = tenderlyResponse.data;

    // console.log('*** Tenderly response', JSON.stringify(response));

    return response.simulation_results.map((result: TenderlyRawSimulationResponse) =>
      tenderlySimulationToResult(result, options),
    );
  } catch (error) {
    const errorResponse = {
      status: false,
      // from: transactionPreparedToSimulation.from,
      // to: transactionPreparedToSimulation.to,
      // gas: transactionPreparedToSimulation.gas,
      // gasPrice: transactionPreparedToSimulation.gas_price,
      chainId: options.chainId,
      error,
    };

    if (axios.isAxiosError(error)) {
      errorResponse.error = {
        type: 'Axios Error',
        data: error.response?.data,
      };
    }

    return [errorResponse];
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
