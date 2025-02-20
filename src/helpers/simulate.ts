import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getAddress } from '@ensofinance/shortcuts-standards/helpers';
import { Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI, FUNCTION_ID_ERC20_APPROVE } from '../constants';
import { simulateTransactionOnForge } from '../simulations/simulateOnForge';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../simulations/simulateOnQuoter';
import type { BuiltShortcut, Report, SimulationLogConfig, SimulationRoles, TransactionToSimulate } from '../types';
import { getEncodedData } from './call';

const recipeMarketHubInterface = new Interface([
  'function createCampaign(uint256) external view returns (address)',
  'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
]);

const DEFAULT_TX_VALUE = '0';

function getAmountInForNativeToken(nativeToken: string, tokenIn: string[], amountIn: string[]): string | undefined {
  const index = tokenIn.findIndex((token) => token.toLowerCase() === nativeToken.toLowerCase());

  if (index === -1) return DEFAULT_TX_VALUE;

  const amountInNativeToken = amountIn[index];

  if (!amountInNativeToken || amountInNativeToken === DEFAULT_TX_VALUE || Number(amountInNativeToken) === 0) {
    throw new Error(`simulateShortcutOnQuoter: missing 'amountIn' for native token at index: ${index}`);
  }
  return amountInNativeToken;
}

export async function simulateShortcutOnQuoter(
  provider: StaticJsonRpcProvider,
  chainId: ChainIds,
  script: WeirollScript,
  amountsIn: string[],
  tokensIn: AddressArg[],
  tokensOut: AddressArg[],
  roles: SimulationRoles,
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  const { txData } = await generateTxData(provider, script, roles);

  const tx: APITransaction = {
    from: roles.caller.address!,
    to: roles.callee!.address!,
    data: txData,
    value: getAmountInForNativeToken(roles.nativeToken.address!, tokensIn, amountsIn)!,
    receiver: roles.weirollWallet!.address,
    executor: roles.weirollWallet!.address,
  };
  const quoteTokens = [...tokensOut, ...tokensIn]; //find dust

  const request: QuoteRequest = {
    chainId,
    transactions: [tx],
    tokenIn: tokensIn,
    tokenOut: quoteTokens,
    amountIn: amountsIn,
  };

  const quote = (await simulateTransactionOnQuoter(request))[0];
  if (quote.status === 'Error') throw quote.error;
  const report: Report = {
    weirollWallet: getAddress(roles.weirollWallet!.address!),
    amountsIn,
    quote: {},
    dust: {},
    gas: quote.gas,
  };

  tokensOut.forEach((t) => {
    const index = quoteTokens.findIndex((q) => q === t);
    report.quote[t] = quote.amountOut[index];
  });
  tokensIn.forEach((t) => {
    const index = quoteTokens.findIndex((q) => q === t);
    report.dust[t] = quote.amountOut[index];
  });

  if (simulationLogConfig.isReportLogged) {
    console.log('Simulation (Report):\n', report, '\n');
  }

  return report;
}

export async function simulateShortcutOnForge(
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
  txsToSim: TransactionToSimulate[],
  builtShortcuts: BuiltShortcut[],
  script: WeirollScript,
  forgePath: string,
  roles: SimulationRoles,
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  // TODO
  // amountsIn: string[],
  // tokensIn: AddressArg[],
  // tokensOut: AddressArg[],
  // blockNumber: number,

  const forgeContract = 'Simulation_Fork_Test';
  const forgeTest = 'test_simulateShortcut_1';
  const forgeTestRelativePath = 'test/foundry/fork/Simulation_Fork_Test.t.sol';
  const forgeContractABI = CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI;

  const { txData } = await generateTxData(provider, builtShortcuts, roles);

  // For ALL the transactions to simulate
  const addressToLabel: Map<AddressArg, string> = new Map();
  const nativeToken = roles.nativeToken.address as AddressArg;
  const tokensInHolders: AddressArg[] = [];
  for (const [index, txToSim] of txsToSim.entries()) {
    // 1. Get labels for known addresses (applies to all transactions to simulate)
    if (txToSim.shortcut.getAddressData) {
      const addressToData = txToSim.shortcut.getAddressData(chainId);
      // Map address to labels
      for (const [address, data] of addressToData) {
        addressToLabel.set(address, data.label);
      }
    }
    for (const { address, label } of Object.values(roles)) {
      addressToLabel.set(address, label);
    }

    // 2. Get holder addresses for tokens In
    if (txToSim.shortcut.getTokenHolder) {
      const tokenToHolder = txToSim.shortcut.getTokenHolder(chainId);
      const { tokensIn: tokensInRaw } = builtShortcuts[index].metadata;
      const tokensIn = tokensInRaw as AddressArg[];
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
  }

  // For THE LAST transaction to simulate
  // 2. Get addresses for dust tokens from commands
  const lastBuiltShortcut = builtShortcuts.at(-1) as BuiltShortcut;
  const tokensDustRaw: Set<AddressArg> = new Set();
  for (const command of lastBuiltShortcut.script.commands) {
    if (command.startsWith(FUNCTION_ID_ERC20_APPROVE)) {
      // NOTE: spender address is the last 20 bytes of the data (not checksum)
      tokensDustRaw.add(getAddress(`0x${command.slice(-40)}`));
    }
  }
  // NOTE: tokensOut shouldn't be flagged as dust
  const lastBuiltShortcutTokensOut = lastBuiltShortcut.metadata.tokensOut as AddressArg[];
  const tokensDust = tokensDustRaw.difference(new Set(lastBuiltShortcutTokensOut) as Set<AddressArg>);

  // TODO: this is for all txs

  // TODO: missing tx blockNumbers, and blockTimestamps
  const forgeData = {
    path: forgePath,
    contract: forgeContract,
    contractABI: forgeContractABI,
    test: forgeTest,
    testRelativePath: forgeTestRelativePath,
  };
  const tokensData = {
    tokensIn,
    tokensInHolders: [...tokensInHolders] as AddressArg[],
    amountsIn: amountsIn as AddressArg[],
    tokensOut,
    tokensDust: [...tokensDust] as AddressArg[],
  };

  const txValue = getAmountInForNativeToken(nativeToken, tokensIn, amountsIn) || DEFAULT_TX_VALUE;

  const forgeTestLog = simulateTransactionOnForge(
    provider,
    roles,
    txData,
    txValue,
    tokensData,
    addressToLabel,
    forgeData,
    chainId,
    blockNumber,
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
  const gasUsedLog = testResult.logs.find((log) => log.topics[0] === gasUsedTopic);
  if (!gasUsedLog) throw new Error('simulateShortcutOnForge: missing "SimulationReportGasUsed" used log');
  const gasUsed = contractInterface.parseLog(gasUsedLog).args.gasUsed;

  // Decode Quote
  const quoteTopic = contractInterface.getEventTopic('SimulationReportQuote');
  const quoteLog = testResult.logs.find((log) => log.topics[0] === quoteTopic);
  if (!quoteLog) throw new Error('simulateShortcutOnForge: missing "SimulationReportQuote" used log');
  const quoteTokensOut = contractInterface.parseLog(quoteLog).args.tokensOut;
  const quoteAmountsOut = contractInterface.parseLog(quoteLog).args.amountsOut;

  // Decode Dust
  const dustTopic = contractInterface.getEventTopic('SimulationReportDust');
  const dustLog = testResult.logs.find((log) => log.topics[0] === dustTopic);
  if (!dustLog) throw new Error('simulateShortcutOnForge: missing "SimulationReportDust" used log');
  const dustTokensDust = contractInterface.parseLog(dustLog).args.tokensDust;
  const dustAmountsDust = contractInterface.parseLog(dustLog).args.amountsDust;

  // Instantiate Report
  const report = {
    weirollWallet: getAddress(roles.weirollWallet!.address!),
    amountsIn,
    quote: Object.fromEntries(
      quoteTokensOut.map((key: AddressArg, idx: number) => [key, quoteAmountsOut[idx].toString()]),
    ),
    dust: Object.fromEntries(
      dustTokensDust.map((key: AddressArg, idx: number) => [key, dustAmountsDust[idx].toString()]),
    ),
    gas: gasUsed.toString(),
  };

  if (simulationLogConfig.isReportLogged) {
    console.log('Simulation (Report):\n', report, '\n');
  }

  return report;
}

async function generateTxDataOld(
  provider: StaticJsonRpcProvider,
  script: WeirollScript,
  roles: SimulationRoles,
): Promise<{
  txData: string;
  reportPre: Partial<Report>;
}> {
  const { commands, state } = script;

  const reportPre: Partial<Report> = {};

  const wallet = await getNextWeirollWalletFromMockRecipeMarketHub(provider, roles.recipeMarketHub.address!);
  roles.weirollWallet = { address: wallet, label: 'WeirollWallet' };
  roles.callee = roles.recipeMarketHub;
  const txData = getEncodedData(commands, state);

  return { txData, reportPre };
}

async function generateTxData(
  provider: StaticJsonRpcProvider,
  builtShortcuts: BuiltShortcut[],
  roles: SimulationRoles,
): Promise<{
  txData: string[];
  reportPre: Partial<Report>;
}> {
  const reportPre: Partial<Report> = {};

  const wallet = await getNextWeirollWalletFromMockRecipeMarketHub(provider, roles.recipeMarketHub.address!);
  roles.weirollWallet = { address: wallet, label: 'WeirollWallet' };
  roles.callee = roles.recipeMarketHub;

  const txData: string[] = [];
  for (const builtShortcut of builtShortcuts) {
    const { commands, state } = builtShortcut.script;
    txData.push(getEncodedData(commands, state));
  }

  return { txData, reportPre };
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
