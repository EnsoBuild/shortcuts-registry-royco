import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ensofinance/shortcuts-standards/helpers';
import { Interface } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI, FUNCTION_ID_ERC20_APPROVE } from '../constants';
import { simulateTransactionOnForge } from '../simulations/simulateOnForge';
import type {
  BuiltShortcut,
  Report,
  ShortcutReport,
  SimulationLogConfig,
  SimulationRoles,
  TransactionToSimulate,
  TransactionToSimulateForgeData,
} from '../types';
import { getEncodedData } from './call';

const recipeMarketHubInterface = new Interface([
  'function createCampaign(uint256) external view returns (address)',
  'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
]);

const DEFAULT_TX_VALUE = '0';
const DEFAULT_BLOCK_NUMBER = -1;
const DEFAULT_BLOCK_TIMESTAMP = -1;

function getAmountInForNativeToken(
  nativeToken: AddressArg,
  tokenIn: AddressArg[],
  amountIn: BigNumberish[],
): string | undefined {
  const index = tokenIn.findIndex((token) => token.toLowerCase() === nativeToken.toLowerCase());

  if (index === -1) return DEFAULT_TX_VALUE;

  const amountInNativeToken = amountIn[index].toString();

  if (!amountInNativeToken || amountInNativeToken === DEFAULT_TX_VALUE || Number(amountInNativeToken) === 0) {
    throw new Error(`simulateShortcutOnQuoter: missing 'amountIn' for native token at index: ${index}`);
  }
  return amountInNativeToken;
}

export async function simulateShortcutOnForge(
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
  txsToSim: TransactionToSimulate[],
  builtShortcuts: BuiltShortcut[],
  forgePath: string,
  roles: SimulationRoles,
  tokenToHolder: Map<AddressArg, AddressArg>,
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  const forgeData = {
    path: forgePath,
    forgeTestLogFormat: simulationLogConfig.forgeTestLogFormat,
    contract: 'Simulation_Fork_Test',
    contractABI: CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI,
    test: 'test_simulateShortcut_1',
    testRelativePath: 'test/foundry/fork/Simulation_Fork_Test.t.sol',
  };

  const wallet = await getNextWeirollWalletFromMockRecipeMarketHub(provider, roles.recipeMarketHub.address!);
  roles.weirollWallet = { address: wallet, label: 'WeirollWallet' };
  roles.callee = roles.recipeMarketHub;

  // For ALL the transactions to simulate
  const addressToLabel: Map<AddressArg, string> = new Map();
  for (const txToSim of txsToSim) {
    // 1. Get labels for known addresses (applies to all transactions to simulate)
    if (txToSim.shortcut.getAddressData) {
      const addressToData = txToSim.shortcut.getAddressData(chainId);

      if (([...addressToData.keys()] as (undefined | string)[]).includes(undefined)) {
        // @ts-expect-error key is AddressArg
        const missingAddressLabel = addressToLabel.get(undefined);
        throw new Error(
          `Missing address in '${txToSim.shortcut.name}' shortcut inside 'getAddressData()', check key spelling. ` +
            `Key: undefined (missing), Value: ${missingAddressLabel}`,
        );
      }
      // Map address to labels
      for (const [address, data] of addressToData) {
        addressToLabel.set(address, data.label);
      }
    }
    for (const { address, label } of Object.values(roles)) {
      addressToLabel.set(address, label);
    }
  }

  const nativeToken = roles.nativeToken.address as AddressArg;
  const shortcutNames: string[] = [];
  const blockNumbers: number[] = [];
  const blockTimestamps: number[] = [];
  const txData: string[] = [];
  const txValues: string[] = [];
  const tokensIn: AddressArg[][] = [];
  const tokensInHolders: AddressArg[][] = [];
  const amountsIn: string[][] = [];
  const requiresFunding: boolean[] = [];
  const tokensOut: AddressArg[][] = [];
  const tokensDust: AddressArg[][] = [];
  for (const [index, txToSim] of txsToSim.entries()) {
    let txForgeData: TransactionToSimulateForgeData;
    try {
      txForgeData = getTxToSimulateForgeData(
        txToSim,
        builtShortcuts[index],
        nativeToken,
        tokenToHolder,
        addressToLabel,
      );
    } catch (error) {
      throw new Error(`Unexpected error getting forge tx data for tx at index: ${index}. Reason: ${error}`);
    }

    shortcutNames.push(txForgeData.shortcutName);
    blockNumbers.push(txForgeData.blockNumber);
    blockTimestamps.push(txForgeData.blockTimestamp);
    txData.push(txForgeData.txData);
    txValues.push(txForgeData.txValue);
    tokensIn.push(txForgeData.tokensIn);
    tokensInHolders.push(txForgeData.tokensInHolders);
    amountsIn.push(txForgeData.amountsIn);
    requiresFunding.push(txForgeData.requiresFunding);
    tokensOut.push(txForgeData.tokensOut);
    tokensDust.push(txForgeData.tokensDust);
  }

  const forgeTestLog = simulateTransactionOnForge(
    chainId,
    provider,
    shortcutNames,
    blockNumbers,
    blockTimestamps,
    txData,
    txValues,
    tokensIn,
    tokensInHolders,
    amountsIn,
    requiresFunding,
    tokensOut,
    tokensDust,
    roles,
    addressToLabel,
    forgeData,
    simulationLogConfig,
  );

  // console.log('forgeTestLog:\n', JSON.stringify(forgeTestLog, null, 2), '\n');
  const testLog = forgeTestLog[`${forgeData.testRelativePath}:${forgeData.contract}`];
  const testResult = testLog.test_results[`${forgeData.test}()`];

  if (testResult.status === 'Failure') {
    console.log('Result: ', testResult);
    throw new Error(
      `Forge simulation test failed. Uncomment '--json' and re-run this script to inspect the forge logs`,
    );
  }

  if (simulationLogConfig.isReportLogged) {
    console.log('Simulation (Forge):\n', testResult.decoded_logs.join('\n'), '\n');
  }

  // Decode logs to write report
  const contractInterface = new Interface(forgeData.contractABI);

  // Decode Gas

  const gasUsedTopic = contractInterface.getEventTopic('SimulationReportGasUsed');
  const gasUsedLogs = testResult.logs.filter((log) => log.topics[0] === gasUsedTopic);
  console.log('*** Gas Used Logs: ', gasUsedLogs);
  if (!gasUsedLogs) throw new Error('simulateShortcutOnForge: missing "SimulationReportGasUsed" used log');

  // Decode Quote
  const quoteTopic = contractInterface.getEventTopic('SimulationReportQuote');
  const quoteLogs = testResult.logs.filter((log) => log.topics[0] === quoteTopic);
  if (!quoteLogs) throw new Error('simulateShortcutOnForge: missing "SimulationReportQuote" used log');

  // Decode Dust
  const dustTopic = contractInterface.getEventTopic('SimulationReportDust');
  const dustLogs = testResult.logs.filter((log) => log.topics[0] === dustTopic);
  if (!dustLogs) throw new Error('simulateShortcutOnForge: missing "SimulationReportDust" used log');

  const report: Report = [];
  for (const [index, txToSim] of txsToSim.entries()) {
    const gasUsed = contractInterface.parseLog(gasUsedLogs[index]).args.gasUsed;
    const quoteTokensOut = contractInterface.parseLog(quoteLogs[index]).args.tokensOut;
    const quoteAmountsOut = contractInterface.parseLog(quoteLogs[index]).args.amountsOut;
    const dustTokensDust = contractInterface.parseLog(dustLogs[index]).args.tokensDust;
    const dustAmountsDust = contractInterface.parseLog(dustLogs[index]).args.amountsDust;

    // Instantiate Report
    const shortcutReport: ShortcutReport = {
      shortcutName: txToSim.shortcut.name,
      weirollWallet: getAddress(roles.weirollWallet!.address!),
      amountsIn: amountsIn[index],
      quote: Object.fromEntries(
        quoteTokensOut.map((key: AddressArg, idx: number) => [key, quoteAmountsOut[idx].toString()]),
      ),
      dust: Object.fromEntries(
        dustTokensDust.map((key: AddressArg, idx: number) => [key, dustAmountsDust[idx].toString()]),
      ),
      gas: gasUsed.toString(),
    };
    report.push(shortcutReport);
  }

  if (simulationLogConfig.isReportLogged) {
    process.stdout.write('Simulation (Report):\n');
    process.stdout.write(JSON.stringify(report, null, 2));
    process.stdout.write('\n');
  }

  return report;
}

async function getNextWeirollWalletFromMockRecipeMarketHub(
  provider: StaticJsonRpcProvider,
  mockRecipeMarketHub: AddressArg,
): Promise<AddressArg> {
  const weirollWalletBytes = await provider.call({
    to: mockRecipeMarketHub,
    data: recipeMarketHubInterface.encodeFunctionData('createCampaign', [0]),
  });

  return `0x${weirollWalletBytes.slice(26)}`;
}

function getTxToSimulateForgeData(
  txToSim: TransactionToSimulate,
  builtShortcut: BuiltShortcut,
  nativeToken: AddressArg,
  tokenToHolder: Map<AddressArg, AddressArg>,
  addressToLabel: Map<AddressArg, string>,
): TransactionToSimulateForgeData {
  const { commands, state } = builtShortcut.script;
  const txData = getEncodedData(commands, state);

  const { tokensIn, tokensOut } = builtShortcut.metadata as { tokensIn: AddressArg[]; tokensOut: AddressArg[] };
  const txValue = getAmountInForNativeToken(nativeToken, tokensIn, txToSim.amountsIn) || DEFAULT_TX_VALUE;
  const amountsIn = txToSim.amountsIn.map((amountIn) => amountIn.toString());
  const requiresFunding = txToSim.requiresFunding ?? false;
  const tokensInHolders: AddressArg[] = [];
  if (tokenToHolder) {
    for (let i = 0; i < (tokensIn as AddressArg[]).length; i++) {
      const holder = tokenToHolder.get(tokensIn[i]);
      const token = tokensIn[i];
      if (token.toLowerCase() === nativeToken.toLowerCase()) continue;

      if (!holder) {
        console.warn(
          `simulateOnForge: no holder found for token: ${tokensIn[i]} (${addressToLabel.get(tokensIn[i])}). ` +
            `If it is missing by mistake, please add it into 'chainIdToTokenHolder' map`,
        );
      }
      tokensInHolders.push(tokenToHolder.get(tokensIn[i]) as AddressArg);
    }
  }

  const tokensDustRaw: Set<AddressArg> = new Set();
  for (const command of commands) {
    if (command.startsWith(FUNCTION_ID_ERC20_APPROVE)) {
      // NOTE: spender address is the last 20 bytes of the data (not checksum)
      tokensDustRaw.add(getAddress(`0x${command.slice(-40)}`));
    }
  }
  // NOTE: tokensOut shouldn't be flagged as dust
  const tokensDust = Array.from(tokensDustRaw.difference(new Set(tokensOut) as Set<AddressArg>));

  const blockNumber = Number(txToSim.blockNumber ?? DEFAULT_BLOCK_NUMBER);
  const blockTimestamp = txToSim.blockTimestamp ?? DEFAULT_BLOCK_TIMESTAMP;

  return {
    shortcutName: txToSim.shortcut.name,
    blockNumber,
    blockTimestamp,
    txData,
    txValue,
    tokensIn,
    tokensInHolders,
    amountsIn,
    requiresFunding,
    tokensOut,
    tokensDust,
  };
}
