// Forge test
export enum ForgeTestLogFormat {
  DEFAULT = '',
  JSON = '--json',
}

export enum ForgeTestLogVerbosity {
  X1V = '-v',
  X2V = '-vv',
  X3V = '-vvv',
  X4V = '-vvvv',
  X5V = '-vvvvv',
}

export enum TraceItemPhase {
  DEPLOYMENT = 'Deployment',
  EXECUTION = 'Execution',
  SETUP = 'Setup',
}

export const DEFAULT_BLOCK_NUMBER = -1;
export const DEFAULT_BLOCK_TIMESTAMP = -1;
export const DEFAULT_TX_AMOUNT_IN_VALUE = '0';

export const CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI = [
  {
    type: 'event',
    name: 'SimulationReportBase',
    inputs: [
      { name: 'shortcutIndex', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'trackedAddress', type: 'address', indexed: false, internalType: 'address' },
      { name: 'tokens', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsDiff', type: 'int256[]', indexed: false, internalType: 'int256[]' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SimulationReportDust',
    inputs: [
      { name: 'shortcutIndex', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'trackedAddress', type: 'address', indexed: false, internalType: 'address' },
      { name: 'tokens', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsDiff', type: 'int256[]', indexed: false, internalType: 'int256[]' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SimulationReportGasUsed',
    inputs: [
      { name: 'shortcutIndex', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'gasUsed', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SimulationReportQuote',
    inputs: [
      { name: 'shortcutIndex', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'trackedAddress', type: 'address', indexed: false, internalType: 'address' },
      { name: 'tokens', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsDiff', type: 'int256[]', indexed: false, internalType: 'int256[]' },
    ],
    anonymous: false,
  },
];
