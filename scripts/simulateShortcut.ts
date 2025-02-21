import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import {
  buildShortcut,
  getForgePath,
  getRpcUrlByChainId,
  getSimulationRolesByChainId,
  getTokenToHolderByChainId,
  simulateShortcutOnForge,
  validateForgeTestLogFormat,
  validateSimulatedTransactions,
} from '../src/helpers';
import type { BuiltShortcut, Report, SimulationLogConfig, TransactionToSimulate } from '../src/types';

const failedSimulationReport = { status: 'Simulation failed', error: '' };

export async function main(
  chainId: ChainIds,
  txs: TransactionToSimulate[],
  simulationLogConfig: SimulationLogConfig,
): Promise<Report> {
  validateForgeTestLogFormat(simulationLogConfig.forgeTestLogFormat);
  validateSimulatedTransactions(txs);

  const tokenToHolder = getTokenToHolderByChainId(chainId);

  const rpcUrl = getRpcUrlByChainId(chainId);
  const provider = new StaticJsonRpcProvider({
    url: rpcUrl,
  });
  const roles = getSimulationRolesByChainId(chainId);

  // NOTE: this could use `Promise.all`
  const builtShortcuts: BuiltShortcut[] = [];
  for (const tx of txs) {
    const builtShortcut = await buildShortcut(chainId, provider, tx.shortcut, tx.amountsIn);
    builtShortcuts.push(builtShortcut);
  }

  let report: Report;
  try {
    const forgePath = getForgePath();
    report = await simulateShortcutOnForge(
      chainId,
      provider,
      txs,
      builtShortcuts,
      forgePath,
      roles,
      tokenToHolder,
      simulationLogConfig,
    );

    return report;
  } catch (error) {
    failedSimulationReport.error = (error as Error).message;
    return failedSimulationReport as unknown as Report;
  }
}
