import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { getForgePath, getRpcUrlByChainId, getSimulationRolesByChainId } from '../src/helpers';
import { validateSimulatedTransactions } from '../src/helpers/args';
import { buildShortcut } from '../src/helpers/shortcuts';
import { simulateShortcutOnForge } from '../src/helpers/simulate';
import type { BuiltShortcut, Report, TransactionToSimulate } from '../src/types';

const failedSimulationReport = { status: 'Simulation failed', error: '' };

export async function main(chainId: ChainIds, txs: TransactionToSimulate[], isTest = false): Promise<Report> {
  validateSimulatedTransactions(txs);

  const rpcUrl = getRpcUrlByChainId(chainId);
  const provider = new StaticJsonRpcProvider({
    url: rpcUrl,
  });
  const roles = getSimulationRolesByChainId(chainId);
  const simulationLogConfig = {
    isReportLogged: true,
    isCalldataLogged: false, // TODO
  };

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
      simulationLogConfig,
    );

    return report;
  } catch (error) {
    failedSimulationReport.error = (error as Error).message;
    return failedSimulationReport as unknown as Report;
  }
}
