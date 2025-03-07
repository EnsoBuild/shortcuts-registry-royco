import type { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { BetterSet, getAddress } from '@ensofinance/shortcuts-standards/helpers';
import { Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { spawnSync } from 'node:child_process';
import { execSync } from 'node:child_process';
import os from 'node:os';

import { FUNCTION_ID_ERC20_APPROVE } from '../../constants';
import { getEncodedData } from '../../helpers';
import { getAmountInForNativeToken } from '../../helpers/simulations';
import type {
  BuiltShortcut,
  ShortcutToSimulate,
  SimulatedShortcutReport,
  SimulationConfig,
  SimulationReport,
  SimulationRoles,
} from '../../types';
import {
  CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI,
  DEFAULT_BLOCK_NUMBER,
  DEFAULT_BLOCK_TIMESTAMP,
  DEFAULT_TX_AMOUNT_IN_VALUE,
  ForgeTestLogFormat,
  ForgeTestLogVerbosity,
} from './constants';
import type { ForgeTestLogJSON, ShortcutToSimulateForgeData, SimulationForgeData } from './types';

function getForgePath(): string {
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

function getTxToSimulateForgeData(
  txToSim: ShortcutToSimulate,
  builtShortcut: BuiltShortcut,
  nativeToken: AddressArg,
  tokenToHolder: Map<AddressArg, AddressArg>,
  addressToLabel: Map<AddressArg, string>,
  roles: SimulationRoles,
): ShortcutToSimulateForgeData {
  const { commands, state } = builtShortcut.script;
  const txData = getEncodedData(commands, state);

  const { tokensIn, tokensOut } = builtShortcut.metadata as { tokensIn: AddressArg[]; tokensOut: AddressArg[] };
  const txValue = getAmountInForNativeToken(nativeToken, tokensIn, txToSim.amountsIn) || DEFAULT_TX_AMOUNT_IN_VALUE;
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

  const blockNumber = Number(txToSim.blockNumber ?? DEFAULT_BLOCK_NUMBER);
  const blockTimestamp = txToSim.blockTimestamp ?? DEFAULT_BLOCK_TIMESTAMP;
  const addressedToTrackAlwaysSet = new BetterSet([roles.caller.address!, roles.weirollWallet!.address!]);
  const addressedToTrackSet = new Set(txToSim.trackedAddresses ?? []);
  const trackedAddresses = Array.from(addressedToTrackAlwaysSet.union(addressedToTrackSet));

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
    trackedAddresses,
  };
}

function simulateShortcutsOnForge(
  chainId: number,
  provider: StaticJsonRpcProvider,
  shortcutNames: string[],
  blockNumbers: number[],
  blockTimestamps: number[],
  txData: string[],
  txValues: string[],
  tokensIn: AddressArg[][],
  tokensInHolders: AddressArg[][],
  amountsIn: string[][],
  requiresFunding: boolean[],
  tokensOut: AddressArg[][],
  tokensDust: AddressArg[][],
  trackedAddresses: AddressArg[][],
  roles: SimulationRoles,
  addressToLabel: Map<AddressArg, string>,
  forgeData: SimulationForgeData,
  simulationConfig: SimulationConfig,
): ForgeTestLogJSON {
  const rpcUrl = provider.connection.url;
  if (!roles.callee?.address) {
    throw new Error("simulateShortcutsOnForge: missing 'callee' address in 'roles'");
  }
  if (!roles.weirollWallet?.address) {
    throw new Error("simulateShortcutsOnForge: missing 'weirollWallet' address in 'roles'");
  }

  const simulationJsonDataRaw = {
    chainId,
    rpcUrl,
    shortcutNames,
    blockNumbers,
    blockTimestamps,
    caller: roles.caller.address,
    recipeMarketHub: roles.recipeMarketHub.address,
    callee: roles.callee.address,
    weirollWallet: roles.weirollWallet.address,
    txData,
    txValues,
    tokensIn,
    tokensInHolders,
    amountsIn,
    requiresFunding,
    tokensOut,
    tokensDust,
    trackedAddresses,
    labelKeys: [...addressToLabel.keys()],
    labelValues: [...addressToLabel.values()],
  };

  if (simulationConfig.isForgeTxDataLogged) {
    process.stdout.write('Simulation JSON Data Sent to Forge:\n');
    process.stdout.write(JSON.stringify(simulationJsonDataRaw, null, 2));
    process.stdout.write('\n');
  }

  // NOTE: foundry JSON parsing cheatcodes don't support multidimensional arrays, therefore we stringify them
  const simulationJsonData = {
    chainId,
    rpcUrl,
    shortcutNames,
    blockNumbers,
    blockTimestamps,
    caller: roles.caller.address,
    recipeMarketHub: roles.recipeMarketHub.address,
    callee: roles.callee.address,
    weirollWallet: roles.weirollWallet.address,
    txData,
    txValues,
    tokensIn: tokensIn.map((tokens) => JSON.stringify(tokens)),
    tokensInHolders: tokensInHolders.map((addresses) => JSON.stringify(addresses)),
    requiresFunding,
    amountsIn: amountsIn.map((amounts) => JSON.stringify(amounts)),
    tokensOut: tokensOut.map((tokens) => JSON.stringify(tokens)),
    tokensDust: tokensDust.map((tokens) => JSON.stringify(tokens)),
    trackedAddresses: trackedAddresses.map((addresses) => JSON.stringify(addresses)),
    labelKeys: [...addressToLabel.keys()],
    labelValues: [...addressToLabel.values()],
  };
  const forgeCmd = os.platform() === 'win32' ? 'forge.cmd' : 'forge'; // ! untested on Windows
  // NOTE: `spawnSync` forge call return can optionally be read from both `return.stdout` and `return.stderr`, and processed.
  // NOTE: calling forge with `--json` will print the deployment information as JSON.
  // NOTE: calling forge with `--gas-report` will print the gas report.
  // NOTE: calling forge with `-vvv` prevents too much verbosity (i.e. `setUp` steps), but hides traces from successful
  // tests. To make visible successful test traces, use `-vvvv`.
  const result = spawnSync(
    forgeCmd,
    [
      'test',
      '--match-contract',
      forgeData.contract,
      '--match-test',
      forgeData.test,
      forgeData.forgeTestLogVerbosity,
      forgeData.forgeTestLogFormat,
    ],
    {
      encoding: 'utf-8',
      env: {
        PATH: `${process.env.PATH}:${forgeData.path}"`,
        SIMULATION_JSON_DATA: JSON.stringify(simulationJsonData),
        TERM: process.env.TER || 'xterm-256color',
        FORCE_COLOR: '1',
      },
    },
  );

  if (result.error) {
    throw new Error(`simulateShortcutsOnForge: unexpected error calling 'forge'. Reason: ${result.stderr}`);
  }

  if (!result.stdout) {
    throw new Error(
      `simulateShortcutsOnForge: unexpected error calling 'forge'. ` +
        `Reason: it didn't error but 'stdout' is falsey: ${result.stdout}. 'stderr' is: ${result.stderr}`,
    );
  }

  if ([ForgeTestLogFormat.DEFAULT].includes(forgeData.forgeTestLogFormat)) {
    process.stdout.write(result.stdout);
    throw new Error('simulateShortcutsOnForge: Forced termination to inspect forge test log');
  }

  let forgeTestLog: ForgeTestLogJSON;
  try {
    forgeTestLog = JSON.parse(result.stdout) as ForgeTestLogJSON;
  } catch (error) {
    throw new Error(`simulateShortcutsOnForge: unexpected error parsing 'forge' JSON output. Reason: ${error}`);
  }

  return forgeTestLog;
}

export async function simulateShortcutsWithForgeAndGenerateReport(
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
  txsToSim: ShortcutToSimulate[],
  builtShortcuts: BuiltShortcut[],
  roles: SimulationRoles,
  tokenToHolder: Map<AddressArg, AddressArg>,
  addressToLabel: Map<AddressArg, string>,
  simulationConfig: SimulationConfig,
): Promise<SimulationReport> {
  const forgePath = getForgePath();

  const forgeData = {
    path: forgePath,
    forgeTestLogFormat: simulationConfig.forgeTestLogFormat as ForgeTestLogFormat,
    forgeTestLogVerbosity: simulationConfig.forgeTestLogVerbosity as ForgeTestLogVerbosity,
    contract: 'SimulateShortcuts_Fork_Test',
    contractABI: CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI,
    test: 'test_simulateShortcuts_1',
    testRelativePath: 'test/foundry/fork/SimulateShortcuts_Fork_Test.t.sol',
  };

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
  const trackedAddresses: AddressArg[][] = [];
  for (const [index, txToSim] of txsToSim.entries()) {
    let txForgeData: ShortcutToSimulateForgeData;
    try {
      txForgeData = getTxToSimulateForgeData(
        txToSim,
        builtShortcuts[index],
        nativeToken,
        tokenToHolder,
        addressToLabel,
        roles,
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
    trackedAddresses.push(txForgeData.trackedAddresses);
  }

  const forgeTestLog = simulateShortcutsOnForge(
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
    trackedAddresses,
    roles,
    addressToLabel,
    forgeData,
    simulationConfig,
  );

  const testLog = forgeTestLog[`${forgeData.testRelativePath}:${forgeData.contract}`];
  const testResult = testLog.test_results[`${forgeData.test}()`];

  if (testResult.status === 'Failure') {
    process.stdout.write('Result: ');
    process.stdout.write(JSON.stringify(testResult, null, 2));
    process.stdout.write('\n');
    throw new Error(
      `Forge simulation test failed. Uncomment '--json' and re-run this script to inspect the forge logs`,
    );
  }

  if (simulationConfig.isForgeLogsLogged) {
    process.stdout.write('Simulation Forge Decoded Logs:\n');
    process.stdout.write(testResult.decoded_logs.join('\n'));
    process.stdout.write('\n');
  }

  // Decode logs to write report
  const contractInterface = new Interface(forgeData.contractABI);

  // Decode Gas
  const gasUsedTopic = contractInterface.getEventTopic('SimulationReportGasUsed');
  const gasUsedLogs = testResult.logs.filter((log) => log.topics[0] === gasUsedTopic);
  if (!gasUsedLogs) throw new Error('missing "SimulationReportGasUsed" used log');
  const decodedGasUsed = gasUsedLogs.map((log) => contractInterface.parseLog(log));

  // Decode Base
  const baseTopic = contractInterface.getEventTopic('SimulationReportBase');
  const baseLogs = testResult.logs.filter((log) => log.topics[0] === baseTopic);
  if (!baseLogs) throw new Error('missing "SimulationReportBase" used log');
  const decodedBaseLogs = baseLogs.map((log) => contractInterface.parseLog(log));

  // Decode Quote
  const quoteTopic = contractInterface.getEventTopic('SimulationReportQuote');
  const quoteLogs = testResult.logs.filter((log) => log.topics[0] === quoteTopic);
  if (!quoteLogs) throw new Error('missing "SimulationReportQuote" used log');
  const decodedQuoteLogs = quoteLogs.map((log) => contractInterface.parseLog(log));

  // Decode Dust
  const dustTopic = contractInterface.getEventTopic('SimulationReportDust');
  const dustLogs = testResult.logs.filter((log) => log.topics[0] === dustTopic);
  if (!dustLogs) throw new Error('missing "SimulationReportDust" used log');
  const decodedDustLogs = dustLogs.map((log) => contractInterface.parseLog(log));

  const simulationReport: SimulationReport = [];
  for (const [index, txToSim] of txsToSim.entries()) {
    const txGasUsed = decodedGasUsed[index].args.gasUsed.toString() as string;

    const txBaseLogs = decodedBaseLogs.filter((log) => log.args.shortcutIndex.toString() === index.toString());
    const baseReport: Record<string, Record<AddressArg, string>> = {};
    for (const txBaseLog of txBaseLogs) {
      const trackedAddress = txBaseLog.args.trackedAddress as AddressArg;
      const tokens = txBaseLog.args.tokens as AddressArg[];
      const amountsDiff = txBaseLog.args.amountsDiff as AddressArg[];
      baseReport[trackedAddress] = Object.fromEntries(
        tokens.map((key: AddressArg, idx: number) => [key, amountsDiff[idx].toString()]),
      );
    }

    const txQuoteLogs = decodedQuoteLogs.filter((log) => log.args.shortcutIndex.toString() === index.toString());
    const quoteReport: Record<string, Record<AddressArg, string>> = {};
    for (const txQuoteLog of txQuoteLogs) {
      const trackedAddress = txQuoteLog.args.trackedAddress as AddressArg;
      const tokens = txQuoteLog.args.tokens as AddressArg[];
      const amountsDiff = txQuoteLog.args.amountsDiff as AddressArg[];
      quoteReport[trackedAddress] = Object.fromEntries(
        tokens.map((key: AddressArg, idx: number) => [key, amountsDiff[idx].toString()]),
      );
    }

    const txDustLogs = decodedDustLogs.filter((log) => log.args.shortcutIndex.toString() === index.toString());
    const dustReport: Record<string, Record<AddressArg, string>> = {};
    for (const txDustLog of txDustLogs) {
      const trackedAddress = txDustLog.args.trackedAddress as AddressArg;
      const tokens = txDustLog.args.tokens as AddressArg[];
      const amountsDiff = txDustLog.args.amountsDiff as AddressArg[];
      dustReport[trackedAddress] = Object.fromEntries(
        tokens.map((key: AddressArg, idx: number) => [key, amountsDiff[idx].toString()]),
      );
    }

    // Instantiate SimulationReport
    const simulatedShortcutReport: SimulatedShortcutReport = {
      isSuccessful: true,
      chainId,
      block: {
        number: txToSim.blockNumber!.toString(),
        timestamp: txToSim.blockTimestamp!,
      },
      shortcutName: txToSim.shortcut.name,
      caller: getAddress(roles.caller.address!),
      weirollWallet: getAddress(roles.weirollWallet!.address!),
      amountsIn: amountsIn[index],
      base: baseReport,
      quote: quoteReport,
      dust: dustReport,
      gas: txGasUsed,
      // TODO: rawShortcut
    };
    simulationReport.push(simulatedShortcutReport);
  }

  if (simulationConfig.isReportLogged) {
    process.stdout.write('Simulation Report:\n');
    process.stdout.write(JSON.stringify(simulationReport, null, 2));
    process.stdout.write('\n');
  }

  if (!simulationConfig.isRawResultInReport) {
    simulationReport.forEach((report) => delete report.rawShortcut);
  }

  return simulationReport;
}
