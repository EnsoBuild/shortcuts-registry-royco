import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import {
  buildShortcut,
  getForgePath,
  getRpcUrlByChainId,
  getSimulationRolesByChainId,
  getTokenToHolderByChainId,
  simulateShortcutsWithForgeAndGenerateReport,
  validateAndGetShortcutsToSimulate,
  validateAndGetSimulationConfig,
} from '../src/helpers';
import type { BuiltShortcut, ShortcutToSimulate, SimulationLogConfig, SimulationReport } from '../src/types';

const failedSimulationReport = { status: 'Simulation failed', error: '' };

export async function main(
  chainId: ChainIds,
  txsToSimInput: ShortcutToSimulate[],
  simulationLogConfigInput?: SimulationLogConfig,
): Promise<SimulationReport> {
  const simulationLogConfig = validateAndGetSimulationConfig(simulationLogConfigInput);
  const txsToSim = validateAndGetShortcutsToSimulate(txsToSimInput);

  const tokenToHolder = getTokenToHolderByChainId(chainId);

  const rpcUrl = getRpcUrlByChainId(chainId);
  const provider = new StaticJsonRpcProvider({
    url: rpcUrl,
  });
  const roles = getSimulationRolesByChainId(chainId);

  // NOTE: this could use `Promise.all`
  const builtShortcuts: BuiltShortcut[] = [];
  for (const tx of txsToSim) {
    const builtShortcut = await buildShortcut(chainId, provider, tx.shortcut, tx.amountsIn);
    builtShortcuts.push(builtShortcut);
  }

  let report: SimulationReport;
  try {
    const forgePath = getForgePath();
    report = await simulateShortcutsWithForgeAndGenerateReport(
      chainId,
      provider,
      txsToSim,
      builtShortcuts,
      forgePath,
      roles,
      tokenToHolder,
      simulationLogConfig,
    );

    return report;
  } catch (error) {
    failedSimulationReport.error = (error as Error).message;
    return failedSimulationReport as unknown as SimulationReport;
  }
}
