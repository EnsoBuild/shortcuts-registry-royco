import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import fs from 'fs';
import path from 'path';

import { ForgeTestLogFormat, ForgeTestLogVerbosity } from '../src/constants';
import {
  buildShortcut,
  getAllMarkets,
  getForgePath,
  getRpcUrlByChainId,
  getSimulationRolesByChainId,
  getTokenToHolderByChainId,
  shortcuts,
  simulateShortcutsWithForgeAndGenerateReport,
  validateAndGetShortcutsToSimulate,
  validateAndGetSimulationConfig,
} from '../src/helpers';
import type {
  BuiltShortcut,
  ScenarioToSimulate,
  Shortcut,
  ShortcutToSimulate,
  SimulationLogConfig,
  SimulationReport,
} from '../src/types';

const failedSimulationReport = { status: 'Simulation failed', error: '' };

export async function main_(
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

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Error: Missing JSON filename argument of the scenario to simulate');
    process.exit(1);
  }

  let jsonFilename = args[0];
  if (!jsonFilename.endsWith('.json')) {
    jsonFilename += '.json';
  }
  const filePath = path.join(__dirname, '../simulation-scenarios', jsonFilename);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File "${jsonFilename}" not found in folder: ${filePath}`);
    process.exit(1);
  }

  let scenariosToSimulate: ScenarioToSimulate[];
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    scenariosToSimulate = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error parsing JSON file: ${(error as Error).message}`);
    process.exit(1);
  }

  const txsToSimulate: ShortcutToSimulate[] = [];
  for (const [index, scenario] of scenariosToSimulate.entries()) {
    const [protocol, ...marketItems] = scenario.shortcut.split('-');
    let shortcut: Shortcut;
    try {
      shortcut = shortcuts[protocol][marketItems.join('-')];
    } catch {
      console.error(
        `Error: Shortcut "${scenario.shortcut}" not found in 'shortcuts' object. ` +
          `Available shortcuts are: ${JSON.stringify(getAllMarkets(), null, 2)}`,
      );
      process.exit(1);
    }
    if (!shortcut) {
      console.error(
        `Error: Shortcut "${scenario.shortcut}" not found in 'shortcuts' object. ` +
          `Available shortcuts are: ${JSON.stringify(getAllMarkets(), null, 2)}`,
      );
      process.exit(1);
    }

    txsToSimulate.push({
      ...scenario,
      requiresFunding: index === 0 && !('requiresFunding' in scenario) ? true : (scenario.requiresFunding ?? false), // NB: force funding caller on the 1st shortcut
      shortcut,
    });
  }

  const simulationLogConfigInput = {
    forgeTestLogFormat: ForgeTestLogFormat.JSON,
    forgeTestLogVerbosity: ForgeTestLogVerbosity.X3V,
    isForgeTxDataLogged: false,
    isCalldataLogged: false,
    isForgeLogsLogged: false,
    isReportLogged: true,
  };
  try {
    await main_(ChainIds.Sonic, txsToSimulate, simulationLogConfigInput);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
