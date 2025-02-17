import { AddressArg, ChainIds } from '@ensofinance/shortcuts-builder/types';
import { BigNumber } from '@ethersproject/bignumber';

import type { SimulationRoles } from './types';

export const PRECISION = BigNumber.from(10).pow(18);

export enum SimulationMode {
  ANVIL = 'anvil',
  FORGE = 'forge',
  QUOTER = 'quoter',
  TENDERLY = 'tenderly',
}

export enum ShortcutOutputFormat {
  ROYCO = 'royco',
  FULL = 'full',
}

// Forge test
export enum ForgeTestLogFormat {
  DEFAULT = '',
  JSON = '--json',
}

export enum TraceItemPhase {
  DEPLOYMENT = 'Deployment',
  EXECUTION = 'Execution',
  SETUP = 'Setup',
}

export const FUNCTION_ID_ERC20_APPROVE = '0x095ea7b3';

export const DEFAULT_SETTER_MIN_AMOUNT_OUT = BigNumber.from('1');
export const MAX_BPS = BigNumber.from('10000'); // NB: 100%
export const MIN_BPS = BigNumber.from('0');
export const MIN_AMOUNT_OUT_MIN_SLIPPAGE = BigNumber.from('10000');
export const DEFAULT_SLIPPAGE = BigNumber.from('100');
export const DEFAULT_MIN_AMOUNT_BPS = BigNumber.from('9900');

export const CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI = [
  {
    type: 'event',
    name: 'SimulationReportDust',
    inputs: [
      { name: 'tokensDust', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsDust', type: 'uint256[]', indexed: false, internalType: 'uint256[]' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SimulationReportGasUsed',
    inputs: [{ name: 'gasUsed', type: 'uint256', indexed: false, internalType: 'uint256' }],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SimulationReportQuote',
    inputs: [
      { name: 'tokensOut', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsOut', type: 'uint256[]', indexed: false, internalType: 'uint256[]' },
    ],
    anonymous: false,
  },
];

export const chainIdToSimulationRoles: Map<ChainIds, SimulationRoles> = new Map([
  [
    ChainIds.Sonic,
    {
      caller: {
        address: '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11',
        label: 'Caller',
      },
      recipeMarketHub: {
        address: '0xFcc593aD3705EBcd72eC961c63eb484BE795BDbD',
        label: 'RecipeMarketHub',
      },
      multiCall: {
        address: '0xcA11bde05977b3631167028862bE2a173976CA11',
        label: 'MultiCall',
      },
      roycoWalletHelpers: {
        address: '0x07899ac8BE7462151d6515FCd4773DD9267c9911',
        label: 'RoycoWalletHelpers',
      },
      nativeToken: {
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        label: 'NativeToken',
      },
    },
  ],
]);

export const chainIdToDeFiAddresses: Record<number, Record<string, AddressArg>> = {
  [ChainIds.Sonic]: {
    wSonic: '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38',
  },
};

const tokenToHolderSonic: Map<AddressArg, AddressArg> = new Map([
  [chainIdToDeFiAddresses[ChainIds.Sonic].nativeToken, '0x0000000000000000000000000000000000000000'], // Native Token (funded via `vm.deal(<address>, 1_000 ether)`)
]);

export const chainIdToTokenHolder: Map<ChainIds, Map<AddressArg, AddressArg>> = new Map([
  [ChainIds.Sonic, tokenToHolderSonic],
]);
