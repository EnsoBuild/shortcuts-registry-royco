import type { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { GeneralAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { BetterSet, getAddress } from '@ensofinance/shortcuts-standards/helpers';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

import { DEFAULT_TX_AMOUNT_IN_VALUE, FUNCTION_ID_ERC20_APPROVE } from '../../constants';
import { getEncodeDataNativeBalance, getEncodedDataErc20BalanceOf, getEncodedDataErc20Transfer } from '../../helpers';
import { getEncodedData } from '../../helpers';
import { getAmountInForNativeToken } from '../../helpers/simulations';
import type {
  BuiltShortcut,
  HexString,
  ShortcutToSimulate,
  SimulatedShortcutReport,
  SimulationConfig,
  SimulationReport,
  SimulationRoles,
  SimulationUrlSummary,
  SimulationUrls,
} from '../../types';
import {
  BALANCE_SIMS_OFFSET,
  BALANCE_SIMS_POSITION_TOKENS_DUST,
  BALANCE_SIMS_POSITION_TOKENS_IN,
  BALANCE_SIMS_POSITION_TOKENS_OUT,
  DEFAULT_AMOUNT_FAILED_SIMULATION,
  TenderlySimulationType,
  TxToSimulationDataType,
} from './constants';
import type {
  SimulationIndexData,
  TenderlyApiCredentials,
  TenderlySimulation,
  TenderlySimulationBundleRequestPayload,
  TenderlySimulationBundleResponse,
  TenderlySimulationResult,
  TenderlySimulationResultProcessed,
  TenderlySimulationStateObjects,
  TxToSimulateTenderlyData,
  TxToSimulateTenderlyReportData,
} from './types';

function TenderlyApiCredentials() {
  const apiKey = process.env.TENDERLY_ACCESS_KEY as string;
  if (!apiKey) {
    throw new Error("Missing 'TENDERLY_ACCESS_KEY' environment variable");
  }

  const project = process.env.TENDERLY_PROJECT as string;
  if (!apiKey) {
    throw new Error("Missing 'TENDERLY_PROJECT' environment variable");
  }

  const user = process.env.TENDERLY_USER as string;
  if (!apiKey) {
    throw new Error("Missing 'TENDERLY_USER' environment variable");
  }

  return { apiKey, project, user };
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
  callerNonce: number,
): Generator<TxToSimulateTenderlyData> {
  const caller = roles.caller.address!;
  const callee = roles.callee!.address!;
  const weirollWallet = roles.weirollWallet!.address!;
  const weirollWalletHelper = roles.roycoWalletHelpers!.address!;

  const txBlockNumber = txToSim.blockNumber !== undefined ? BigNumber.from(txToSim.blockNumber).toNumber() : undefined;
  const txBlockTimestamp =
    txToSim.blockTimestamp !== undefined
      ? (BigNumber.from(txToSim.blockTimestamp.toString()).toHexString() as HexString)
      : undefined;

  const { commands, state } = builtShortcut.script;
  const { tokensIn, tokensOut } = builtShortcut.metadata as { tokensIn: AddressArg[]; tokensOut: AddressArg[] };
  const amountsIn = txToSim.amountsIn.map((amountIn) => amountIn.toString());

  const addressedToTrackAlwaysSet = new BetterSet([caller, weirollWallet]);
  const addressedToTrackSet = new Set(txToSim.trackedAddresses ?? []);
  const trackedAddresses = Array.from(addressedToTrackAlwaysSet.union(addressedToTrackSet));

  const tokensDustRaw: Set<AddressArg> = new Set([]);
  for (const command of commands) {
    if (command.startsWith(FUNCTION_ID_ERC20_APPROVE)) {
      // NOTE: spender address is the last 20 bytes of the data (not checksum)
      tokensDustRaw.add(`0x${command.slice(-40)}`.toLowerCase() as AddressArg);
    }
  }

  // NOTE: tokensOut shouldn't be flagged as dust
  const tokensDust = Array.from(
    tokensDustRaw.difference(new Set(tokensOut.map((address) => address.toLowerCase())) as Set<AddressArg>),
  );

  // For each tracked address, yield a simulation that queries the balance of each `tokenIn`, `tokenOut`, and `tokenDust`.
  // This ensures we capture the token balances before execution, allowing us to track changes effectively.
  for (const trackedAddress of trackedAddresses) {
    for (const token of [...tokensIn, ...tokensOut, ...tokensDust]) {
      let txData: string;
      let from: AddressArg;
      let to: AddressArg;
      if (token.toLowerCase() === nativeToken.toLowerCase()) {
        from = trackedAddress; // NOTE: pending to test & confirm if this case alters the caller's nonce
        to = weirollWalletHelper;
        txData = getEncodeDataNativeBalance();
      } else {
        from = GeneralAddresses.vitalik; // NB: prevent using caller's address to avoid nonce alteration
        to = token;
        txData = getEncodedDataErc20BalanceOf(trackedAddress);
      }

      yield {
        type: TxToSimulationDataType.CALL_BALANCE_PRE,
        simulation: {
          network_id: chainId.toString(),
          save: true,
          save_if_fails: true,
          simulation_type: TenderlySimulationType.FULL,
          from,
          to,
          input: txData as HexString,
          value: '0',
          block_header: {
            timestamp: txBlockTimestamp,
          },
          block_number: txBlockNumber,
        },
      };
    }
  }

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

      const txData = getEncodedDataErc20Transfer(weirollWallet, amountsIn[i]);

      yield {
        type: TxToSimulationDataType.TX_FUNDING,
        simulation: {
          network_id: chainId.toString(),
          save: true,
          save_if_fails: true,
          simulation_type: TenderlySimulationType.FULL,
          from: holder,
          to: token,
          input: txData as HexString,
          value: '0',
          block_header: {
            timestamp: txBlockTimestamp,
          },
          block_number: txBlockNumber,
          state_objects: {
            [holder as AddressArg]: {
              balance: BigNumber.from('10').pow(18).toString(), // 1 ETH
            },
          } as TenderlySimulationStateObjects,
        },
      };
    }
  }

  // Yield a simulation that executes the shortcut
  const txData = getEncodedData(commands, state) as HexString;
  const txValue = getAmountInForNativeToken(nativeToken, tokensIn, txToSim.amountsIn) || DEFAULT_TX_AMOUNT_IN_VALUE;

  // NOTE: callerNonce is used to override the caller nonce on the main tx to simulate (shortcut) just in case
  // any "balancePre", funding, and "balancePost" simulations alter the nonce of the caller address.
  const state_objects: TenderlySimulationStateObjects = {
    [caller]: {
      nonce: callerNonce,
    },
  };
  // NOTE: fund the caller address
  if (txIndex === 0) {
    state_objects[caller].balance = BigNumber.from('1000').pow(18).toString(); // 1000 ETH
  }

  yield {
    type: TxToSimulationDataType.TX_SHORTCUT,
    simulation: {
      network_id: chainId.toString(),
      save: true,
      save_if_fails: true,
      simulation_type: TenderlySimulationType.FULL,
      from: caller,
      to: callee,
      input: txData as HexString,
      value: txValue,
      block_header: {
        timestamp: txBlockTimestamp,
      },
      block_number: txBlockNumber,
      state_objects,
    },
  };

  // For each tracked address, yield a simulation that queries the balance of each `tokenIn`, `tokenOut`, and `tokenDust`.
  // This ensures we capture the token balances before execution, allowing us to track changes effectively.
  for (const trackedAddress of trackedAddresses) {
    for (const token of [...tokensIn, ...tokensOut, ...tokensDust]) {
      let txData: string;
      let from: AddressArg;
      let to: AddressArg;
      if (token.toLowerCase() === nativeToken.toLowerCase()) {
        from = trackedAddress; // NOTE: pending to test & confirm if this case alters the caller's nonce
        to = weirollWalletHelper;
        txData = getEncodeDataNativeBalance();
      } else {
        from = GeneralAddresses.vitalik; // NB: prevent using caller's address to avoid nonce alteration
        to = token;
        txData = getEncodedDataErc20BalanceOf(trackedAddress);
      }

      yield {
        type: TxToSimulationDataType.CALL_BALANCE_POST,
        simulation: {
          network_id: chainId.toString(),
          save: true,
          save_if_fails: true,
          simulation_type: TenderlySimulationType.FULL,
          from,
          to,
          input: txData as HexString,
          value: '0',
          block_header: {
            timestamp: txBlockTimestamp,
          },
          block_number: txBlockNumber,
        },
      };
    }
  }

  yield {
    type: TxToSimulationDataType.REPORT,
    tokensIn,
    amountsIn,
    tokensOut,
    tokensDust,
    trackedAddresses,
  };
}

async function simulateShorcutsOnTenderly(
  apiCredentials: TenderlyApiCredentials,
  payload: TenderlySimulationBundleRequestPayload,
): Promise<TenderlySimulationBundleResponse> {
  const URL = `https://api.tenderly.co/api/v1/account/${apiCredentials.user}/project/${apiCredentials.project}/simulate-bundle`;
  const requestConfig = {
    headers: {
      Accept: 'application/json',
      'Content-type': 'application/json',
      'X-Access-Key': apiCredentials.apiKey,
    },
  };

  try {
    const response: AxiosResponse<TenderlySimulationBundleResponse> = await axios.post(URL, payload, requestConfig);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`simulateShortcutsOnTenderly: axios failed to request. Reason: ${error}`);
    }
    throw new Error(`simulateShortcutsOnTenderly: unexpected error requesting. Reason: ${error}`);
  }
}

function getBalanceFromSimulationResult(result: TenderlySimulationResult): BigNumberish {
  return result.transaction.transaction_info.call_trace.decoded_output![0]!.value;
}

function processTenderlySimulationResult(
  type: TxToSimulationDataType,
  resultRaw: TenderlySimulationResult,
  apiCredentials: TenderlyApiCredentials,
): TenderlySimulationResultProcessed {
  const {
    status,
    id: simulationId,
    block_number: blockNumber,
    from,
    to,
    value,
    gas_price: gasPrice,
    network_id: chainId,
  } = resultRaw.simulation;
  const { error_info, transaction_info } = resultRaw.transaction;
  const { gas, gas_used } = transaction_info.call_trace;

  const result = {
    status,
    simulationId,
    simulationUrl: `https://dashboard.tenderly.co/${apiCredentials.user}/${apiCredentials.project}/simulator/${simulationId}`,
    sharableSimulationUrl: `https://dashboard.tenderly.co/public/${apiCredentials.user}/${apiCredentials.project}/simulator/${simulationId}`,
    blockNumber,
    from,
    to,
    value,
    gas,
    gasPrice,
    gasUsed: gas_used,
    chainId,
    error: error_info,
    rawResult: resultRaw,
  } as TenderlySimulationResultProcessed;

  switch (type) {
    case TxToSimulationDataType.CALL_BALANCE_PRE:
    case TxToSimulationDataType.CALL_BALANCE_POST:
      result.output = getBalanceFromSimulationResult(resultRaw);
      break;
    case TxToSimulationDataType.TX_FUNDING:
      break;
    case TxToSimulationDataType.TX_SHORTCUT:
      break;
    default:
      throw new Error(`Unsupported 'type': ${type}`);
  }

  return result;
}

export async function simulateShortcutsWithTenderlyAndGenerateReport(
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
  txsToSim: ShortcutToSimulate[],
  builtShortcuts: BuiltShortcut[],
  roles: SimulationRoles,
  tokenToHolder: Map<AddressArg, AddressArg>,
  addressToLabel: Map<AddressArg, string>,
  simulationConfig: SimulationConfig,
): Promise<SimulationReport> {
  const apiCredentials = TenderlyApiCredentials();

  // NOTE: callerNonce is used to override the caller nonce on the main tx to simulate (shortcut) just in case
  // any "balancePre", "funding", and "balancePost" simulations alter the nonce of the caller address.
  // The whole 'callerNonce' overriding logic can be removed if the caller's nonce is not altered by any simulation.
  // The caller's native token balance is the pending case to test & confirm if it alters the caller's nonce.
  let callerNonce = await provider.getTransactionCount(roles.caller.address!, Number(txsToSim[0].blockNumber!));

  const nativeToken = roles.nativeToken.address as AddressArg;
  const simulations: TenderlySimulation[] = [];
  const simulationTypes: TxToSimulationDataType[] = [];
  const simulationReportDataArray: TxToSimulateTenderlyReportData[] = [];
  const txToSimToSimulationIndexData = new Map<number, SimulationIndexData>();

  let simulationIndex = 0;
  for (const [index, txToSim] of txsToSim.entries()) {
    const simulationIndexData = {
      balancePre: [],
      funding: [],
      shortcut: -1,
      balancePost: [],
    } as SimulationIndexData;

    const simulationGenerator = getTxToSimulateTenderlyData(
      chainId,
      index,
      txToSim,
      builtShortcuts[index],
      nativeToken,
      tokenToHolder,
      addressToLabel,
      roles,
      callerNonce,
    );

    // Collect all simulations from the generator
    let generatorIndex = 0;
    try {
      for (const txToSimTenderlyData of simulationGenerator) {
        const { type } = txToSimTenderlyData;
        // NOTE: do not send this data to be simulated by Tenderly
        if (type === TxToSimulationDataType.REPORT) {
          simulationReportDataArray.push(txToSimTenderlyData);
          generatorIndex++;
          continue;
        }

        const { simulation } = txToSimTenderlyData;

        if (type === TxToSimulationDataType.CALL_BALANCE_PRE) {
          simulationIndexData.balancePre.push(simulationIndex);
        } else if (type === TxToSimulationDataType.TX_FUNDING) {
          simulationIndexData.funding.push(simulationIndex);
        } else if (type === TxToSimulationDataType.TX_SHORTCUT) {
          simulationIndexData.shortcut = simulationIndex;
        } else if (type === TxToSimulationDataType.CALL_BALANCE_POST) {
          simulationIndexData.balancePost.push(simulationIndex);
        } else {
          throw new Error(`Unsupported txToSimTenderlyData 'type': ${type}`);
        }

        simulations.push(simulation);
        simulationTypes.push(type);

        simulationIndex++;
        generatorIndex++;
      }

      txToSimToSimulationIndexData.set(index, simulationIndexData);
    } catch (error) {
      throw new Error(
        `Unexpected error getting TenderlyData at index ${generatorIndex}, for txToSim at index ${index}. Reason: ${error}`,
      );
    }
    callerNonce++;
  }

  if (simulationConfig.isTenderlySimulationsLogged) {
    process.stdout.write('Tenderly Simulations:\n');
    process.stdout.write(JSON.stringify(simulations, null, 2));
    process.stdout.write('\n');
  }

  const result = await simulateShorcutsOnTenderly(apiCredentials, {
    simulations,
  });

  const simulationResults: TenderlySimulationResultProcessed[] = [];

  for (const [index, simulationResultRaw] of result.simulation_results.entries()) {
    let simulationResult: TenderlySimulationResultProcessed;
    try {
      simulationResult = processTenderlySimulationResult(simulationTypes[index], simulationResultRaw, apiCredentials);
    } catch (error) {
      throw new Error(`Unexpected error processing simulation result at index: ${index}. Reason: ${error}`);
    }

    simulationResults.push(simulationResult);
  }

  const simulationReport: SimulatedShortcutReport[] = [];

  for (const [index, txToSim] of txsToSim.entries()) {
    let isSuccessful = true;
    const simulationIndexData = txToSimToSimulationIndexData.get(index) as SimulationIndexData;
    const simulationReportData = simulationReportDataArray[index];

    const simulationsBalancePre = simulationIndexData.balancePre.map((index) => simulationResults[index]);
    const balancePreUrlSummaries: SimulationUrlSummary[] = simulationsBalancePre.map((simulation) => {
      if (!simulation.status) {
        isSuccessful = false;
      }
      return {
        status: simulation.status,
        url: simulation.sharableSimulationUrl as string,
      };
    });

    const simulationsFunding = simulationIndexData.funding.map((index) => simulationResults[index]);
    const fundingUrlSummaries: SimulationUrlSummary[] = simulationsFunding.map((simulation) => {
      if (!simulation.status) {
        isSuccessful = false;
      }
      return {
        status: simulation.status,
        url: simulation.sharableSimulationUrl as string,
      };
    });

    const simulationShortcut = simulationResults[simulationIndexData.shortcut];
    if (!simulationShortcut.status) {
      isSuccessful = false;
    }
    const shortcutUrlSummary = {
      status: simulationShortcut.status,
      url: simulationShortcut.sharableSimulationUrl as string,
    };

    const simulationsBalancePost = simulationIndexData.balancePost.map((index) => simulationResults[index]);
    const balancePostUrlSummaries: SimulationUrlSummary[] = simulationsBalancePost.map((simulation) => {
      if (!simulation.status) {
        isSuccessful = false;
      }
      return {
        status: simulation.status,
        url: simulation.sharableSimulationUrl as string,
      };
    });

    const baseReport: Record<string, Record<AddressArg, string>> = {};
    const quoteReport: Record<string, Record<AddressArg, string>> = {};
    const dustReport: Record<string, Record<AddressArg, string>> = {};
    const simulationUrls = {
      balancePre: {},
      funding: {
        [roles.weirollWallet!.address!]: Object.fromEntries(
          simulationReportData.tokensIn.map((tokenIn, index) => [tokenIn, fundingUrlSummaries[index]]),
        ),
      },
      shortcut: shortcutUrlSummary,
      balancePost: {},
    } as SimulationUrls;

    for (const [taIndex, trackAddress] of simulationReportData.trackedAddresses.entries()) {
      for (const tokenIn of simulationReportData.tokensIn) {
        const balanceIndex = taIndex * BALANCE_SIMS_OFFSET + BALANCE_SIMS_POSITION_TOKENS_IN;
        const balancePre = simulationsBalancePre[balanceIndex];
        const balancePost = simulationsBalancePost[balanceIndex];

        baseReport[trackAddress] ??= {};
        baseReport[trackAddress][tokenIn] = isSuccessful
          ? BigNumber.from(balancePost.output).sub(BigNumber.from(balancePre.output)).toString()
          : DEFAULT_AMOUNT_FAILED_SIMULATION;

        simulationUrls.balancePre[trackAddress] ??= {};
        simulationUrls.balancePre[trackAddress][tokenIn] = balancePreUrlSummaries[balanceIndex];

        simulationUrls.balancePost[trackAddress] ??= {};
        simulationUrls.balancePost[trackAddress][tokenIn] = balancePostUrlSummaries[balanceIndex];
      }

      for (const tokenOut of simulationReportData.tokensOut) {
        const balanceIndex = taIndex * BALANCE_SIMS_OFFSET + BALANCE_SIMS_POSITION_TOKENS_OUT;
        const balancePre = simulationsBalancePre[balanceIndex];
        const balancePost = simulationsBalancePost[balanceIndex];

        quoteReport[trackAddress] ??= {};
        quoteReport[trackAddress][tokenOut] = isSuccessful
          ? BigNumber.from(balancePost.output).sub(BigNumber.from(balancePre.output)).toString()
          : DEFAULT_AMOUNT_FAILED_SIMULATION;

        simulationUrls.balancePre[trackAddress] ??= {};
        simulationUrls.balancePre[trackAddress][tokenOut] = balancePreUrlSummaries[balanceIndex];

        simulationUrls.balancePost[trackAddress] ??= {};
        simulationUrls.balancePost[trackAddress][tokenOut] = balancePostUrlSummaries[balanceIndex];
      }

      for (const tokenDust of simulationReportData.tokensDust) {
        const balanceIndex = taIndex * BALANCE_SIMS_OFFSET + BALANCE_SIMS_POSITION_TOKENS_DUST;
        const balancePre = simulationsBalancePre[balanceIndex];
        const balancePost = simulationsBalancePost[balanceIndex];

        dustReport[trackAddress] ??= {};
        dustReport[trackAddress][tokenDust] = isSuccessful
          ? BigNumber.from(balancePost.output).sub(BigNumber.from(balancePre.output)).toString()
          : DEFAULT_AMOUNT_FAILED_SIMULATION;

        simulationUrls.balancePre[trackAddress] ??= {};
        simulationUrls.balancePre[trackAddress][tokenDust] = balancePreUrlSummaries[balanceIndex];

        simulationUrls.balancePost[trackAddress] ??= {};
        simulationUrls.balancePost[trackAddress][tokenDust] = balancePostUrlSummaries[balanceIndex];
      }
    }

    const simulatedShortcutReport: SimulatedShortcutReport = {
      isSuccessful,
      chainId,
      block: {
        number: txToSim.blockNumber!.toString(),
        timestamp: txToSim.blockTimestamp!,
      },
      shortcutName: txToSim.shortcut.name,
      caller: getAddress(roles.caller.address!),
      weirollWallet: getAddress(roles.weirollWallet!.address!),
      amountsIn: simulationReportData.amountsIn,
      base: baseReport,
      quote: quoteReport,
      dust: dustReport,
      gas: simulationShortcut.gasUsed!.toString(),
      simulationUrls,
      rawShortcut: simulationShortcut.rawResult,
    };
    simulationReport.push(simulatedShortcutReport);
  }

  // NOTE: make sure `rawShortcut` is removed before logging the report!
  if (!simulationConfig.isRawResultInReport) {
    simulationReport.forEach((report) => delete report.rawShortcut);
  }

  if (simulationConfig.isReportLogged) {
    process.stdout.write('Simulation Report:\n');
    process.stdout.write(JSON.stringify(simulationReport, null, 2));
    process.stdout.write('\n');
  }

  return simulationReport;
}
