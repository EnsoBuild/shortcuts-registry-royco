import type { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

import { ForgeTestLogFormat } from '../constants';
import type { ForgeTestLogJSON, SimulationForgeData, SimulationLogConfig, SimulationRoles } from '../types';

export function simulateShortcutsOnForge(
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
  simulationLogConfig: SimulationLogConfig,
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

  if (simulationLogConfig.isForgeTxDataLogged) {
    process.stdout.write('Simulation JSON Data Sent to Forge:\n');
    process.stdout.write(JSON.stringify(simulationJsonDataRaw, null, 2));
    process.stdout.write('\n');
    // console.warn('Simulation (JSON Data):\n', JSON.stringify(simulationJsonDataRaw), '\n');
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
