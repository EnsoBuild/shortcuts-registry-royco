import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { SimulationMode } from '../src/constants';
import {
  getAmountsInFromArgs,
  getBlockNumberFromArgs,
  getForgePath,
  getIsCalldataLoggedFromArgs,
  getRpcUrlByChainId,
  getShortcut,
  getSimulationModeFromArgs,
  getSimulationRolesByChainId,
} from '../src/helpers';
import { simulateShortcutOnForge, simulateShortcutOnQuoter } from '../src/helpers/simulate';
import type { Report } from '../src/types';

export async function main_(args: string[]): Promise<Report> {
  const { shortcut, chainId } = await getShortcut(args);

  const simulatonMode = getSimulationModeFromArgs(args);
  const blockNumber = getBlockNumberFromArgs(args);
  const amountsIn = getAmountsInFromArgs(args);

  const rpcUrl = getRpcUrlByChainId(chainId);
  const provider = new StaticJsonRpcProvider({
    url: rpcUrl,
  });
  const roles = getSimulationRolesByChainId(chainId);
  const simulationLogConfig = {
    isReportLogged: true,
    isCalldataLogged: getIsCalldataLoggedFromArgs(args),
  };

  const { script, metadata } = await shortcut.build(chainId, provider);

  // Validate tokens
  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn || !tokensOut) throw 'Error: Invalid builder metadata. Missing eiter "tokensIn" or "tokensOut"';
  if (amountsIn.length != tokensIn.length) {
    throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length} CSVs`;
  }

  let report: Report;
  switch (simulatonMode) {
    case SimulationMode.FORGE: {
      const forgePath = getForgePath();
      report = await simulateShortcutOnForge(
        provider,
        shortcut,
        chainId,
        script,
        amountsIn,
        tokensIn,
        tokensOut,
        forgePath,
        blockNumber,
        roles,
        simulationLogConfig,
      );
      break;
    }
    case SimulationMode.QUOTER: {
      report = await simulateShortcutOnQuoter(
        provider,
        chainId,
        script,
        amountsIn,
        tokensIn,
        tokensOut,
        roles,
        simulationLogConfig,
      );
      break;
    }
    default:
      throw new Error(`Unsupported simulaton 'mode': ${simulatonMode}. `);
  }

  return report;
}

async function main() {
  try {
    await main_(process.argv.slice(2));
  } catch (error) {
    console.error(error);
  }
}

main();
