import type { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

import { ForgeTestLogFormat } from '../constants';
import type { ForgeTestLogJSON, SimulationForgeData, SimulationRoles, SimulationTokensData } from '../types';

export function simulateTransactionOnForge(
  provider: StaticJsonRpcProvider,
  roles: SimulationRoles,
  txData: string,
  tokensData: SimulationTokensData,
  addressToLabel: Map<AddressArg, string>,
  forgeData: SimulationForgeData,
  chainId: number,
  blockNumber: number,
): ForgeTestLogJSON {
  const rpcUrl = provider.connection.url;
  if (!roles.callee?.address) {
    throw new Error("missing 'callee' address in 'roles'");
  }
  if (!roles.weirollWallet?.address) {
    throw new Error("missing 'weirollWallet' address in 'roles'");
  }

  const simulationJsonData = {
    chainId,
    rpcUrl,
    blockNumber: blockNumber.toString(),
    caller: roles.caller.address,
    recipeMarketHub: roles.recipeMarketHub.address,
    callee: roles.callee.address,
    weirollWallet: roles.weirollWallet.address,
    txData,
    tokensIn: tokensData.tokensIn,
    tokensInHolders: tokensData.tokensInHolders,
    amountsIn: tokensData.amountsIn,
    tokensOut: tokensData.tokensOut,
    tokensDust: tokensData.tokensDust,
    labelKeys: [...addressToLabel.keys()],
    labelValues: [...addressToLabel.values()],
  };

  // NOTE: validate and throw here errors to log better the whole 'simulationJsonData'
  if ((simulationJsonData.labelKeys as (undefined | string)[]).includes(undefined)) {
    console.warn('Simulation (JSON Data):\n', simulationJsonData, '\n');
    // @ts-expect-error key is AddressArg
    const missingAddressLabel = addressToLabel.get(undefined);
    throw new Error(
      `simulateTransactionOnForge: missing address on shorcut 'getAddressData()', check key spelling. ` +
        `Key: undefined (missing), Value: ${missingAddressLabel}`,
    );
  }

  const logFormat = ForgeTestLogFormat.JSON;
  const forgeCmd = os.platform() === 'win32' ? 'forge.cmd' : 'forge'; // ! untested on Windows
  // NOTE: `spawnSync` forge call return can optionally be read from both `return.stdout` and `return.stderr`, and processed.
  // NOTE: calling forge with `--json` will print the deployment information as JSON.
  // NOTE: calling forge with `--gas-report` will print the gas report.
  // NOTE: calling forge with `-vvv` prevents too much verbosity (i.e. `setUp` steps), but hides traces from successful
  // tests. To make visible successful test traces, use `-vvvv`.
  const result = spawnSync(
    forgeCmd,
    ['test', '--match-contract', forgeData.contract, '--match-test', forgeData.test, '-vvv', logFormat],
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
    throw new Error(`simulateTransactionOnForge: unexpected error calling 'forge'. Reason: ${result.stderr}`);
  }

  if (!result.stdout) {
    throw new Error(
      `simulateTransactionOnForge: unexpected error calling 'forge'. ` +
        `Reason: it didn't error but 'stdout' is falsey: ${result.stdout}. 'stderr' is: ${result.stderr}`,
    );
  }

  if ([ForgeTestLogFormat.DEFAULT].includes(logFormat)) {
    console.log(result.stdout);
    throw new Error('Forced termination to inspect forge test log');
  }

  let forgeTestLog: ForgeTestLogJSON;
  try {
    forgeTestLog = JSON.parse(result.stdout) as ForgeTestLogJSON;
  } catch (error) {
    throw new Error(`simulateTransactionOnForge: unexpected error parsing 'forge' JSON output. Reason: ${error}`);
  }

  return forgeTestLog;
}
