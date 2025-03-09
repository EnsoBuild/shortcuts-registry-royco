import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import fs from 'fs';
import path from 'path';

import { SimulationMode, supportedSimulationModes } from '../src/constants';
import {
  buildShortcut,
  getAddressLabelsByChainId,
  getAllMarkets,
  getNextWeirollWalletFromMockRecipeMarketHub,
  getRpcUrlByChainId,
  getSimulationModeFromArgs,
  getSimulationRolesByChainId,
  getTokenToHolderByChainId,
  populateMissingBlockData,
  shortcuts,
  validateAndGetShortcutsToSimulate,
  validateAndGetSimulationConfig,
} from '../src/helpers';
import {
  simulateShortcutsWithForgeAndGenerateReport,
  simulateShortcutsWithTenderlyAndGenerateReport,
} from '../src/simulations';
import { ForgeTestLogFormat, ForgeTestLogVerbosity } from '../src/simulations/forge';
import type {
  BuiltShortcut,
  ScenarioToSimulate,
  Shortcut,
  ShortcutToSimulate,
  SimulationConfig,
  SimulationReport,
} from '../src/types';

const failedSimulationReport = { status: 'Simulation failed', error: '' };

export async function main_(
  chainId: ChainIds,
  txsToSimInput: ShortcutToSimulate[],
  simulationConfigInput?: SimulationConfig,
): Promise<SimulationReport> {
  const rpcUrl = getRpcUrlByChainId(chainId);
  const provider = new StaticJsonRpcProvider({
    url: rpcUrl,
  });
  const simulationConfig = validateAndGetSimulationConfig(simulationConfigInput);
  let txsToSim = await validateAndGetShortcutsToSimulate(provider, txsToSimInput);

  // Populate missing block data (e.g., `blockNumber`, `blockTimestamp`) for each shortcut to simulate
  txsToSim = populateMissingBlockData(txsToSim);

  const roles = getSimulationRolesByChainId(chainId);
  const wallet = await getNextWeirollWalletFromMockRecipeMarketHub(
    provider,
    roles.caller.address!,
    roles.recipeMarketHub.address!,
  );
  roles.weirollWallet = { address: wallet, label: 'WeirollWallet' };
  roles.callee = roles.recipeMarketHub;

  const tokenToHolder = getTokenToHolderByChainId(chainId);
  const addressToLabel = getAddressLabelsByChainId(chainId);

  // For ALL the transactions to simulate
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

  // NOTE: this could use `Promise.all`
  const builtShortcuts: BuiltShortcut[] = [];
  for (const tx of txsToSim) {
    const builtShortcut = await buildShortcut(chainId, provider, tx.shortcut, !!tx.requiresFunding, tx.amountsIn);
    builtShortcuts.push(builtShortcut);
  }

  let report: SimulationReport;
  try {
    switch (simulationConfig.simulationMode) {
      case SimulationMode.FORGE: {
        report = await simulateShortcutsWithForgeAndGenerateReport(
          chainId,
          provider,
          txsToSim,
          builtShortcuts,
          roles,
          tokenToHolder,
          addressToLabel,
          simulationConfig,
        );
        break;
      }
      case SimulationMode.TENDERLY: {
        report = await simulateShortcutsWithTenderlyAndGenerateReport(
          chainId,
          provider,
          txsToSim,
          builtShortcuts,
          roles,
          tokenToHolder,
          addressToLabel,
          simulationConfig,
        );
        break;
      }

      default:
        throw new Error(`Unsupported 'simulationMode': ${simulationConfig.simulationMode}`);
    }
  } catch (error) {
    console.error(error);
    failedSimulationReport.error = (error as Error).message;
    return failedSimulationReport as unknown as SimulationReport;
  }

  return report;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Error: Missing JSON filename argument of the scenario to simulate');
    process.exit(1);
  }

  const simulationMode = getSimulationModeFromArgs(args);
  if (!supportedSimulationModes.includes(simulationMode)) {
    throw new Error(
      `Invalid simulation mode: ${simulationMode}. Supported modes are: ${supportedSimulationModes.join(', ')}`,
    );
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

  try {
    const simulationConfigInput = {
      simulationMode,
      forgeTestLogFormat: ForgeTestLogFormat.JSON,
      forgeTestLogVerbosity: ForgeTestLogVerbosity.X3V,
      isForgeTxDataLogged: false,
      isCalldataLogged: false,
      isForgeLogsLogged: true,
      isReportLogged: true,
      isRawResultInReport: false,
    };
    await main_(ChainIds.Sonic, txsToSimulate, simulationConfigInput);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

// NOTE: prevent running `main()` during tests
if (require.main === module) {
  main();
}
