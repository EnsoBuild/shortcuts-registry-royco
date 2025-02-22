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
export const MAX_BPS = BigNumber.from('10000'); // NOTE: 100%
export const MIN_BPS = BigNumber.from('0');
export const MIN_AMOUNT_OUT_MIN_SLIPPAGE = BigNumber.from('10000');
export const DEFAULT_SLIPPAGE = BigNumber.from('100');
export const DEFAULT_MIN_AMOUNT_BPS = BigNumber.from('9900');

export const CONTRCT_SIMULATION_FORK_TEST_EVENTS_ABI = [
  {
    type: 'event',
    name: 'SimulationReportDust',
    inputs: [
      { name: 'shortcutIndex', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'tokensDust', type: 'address[]', indexed: false, internalType: 'address[]' },
      { name: 'amountsDust', type: 'int256[]', indexed: false, internalType: 'int256[]' },
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
        address: '0x7A1C91392462c55FB7F2eA98905eA8CeEEA04579', // NB: new contract is left as dust
        // address: '0xa2c139FFdeF281504601f3Db8ba49F58Dc1498e4',
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
        label: 'S (NativeToken)',
      },
    },
  ],
]);

// Keep it sorted kinda alphabetically but case insensitive :)
export const chainIdToDeFiAddresses: Record<number, Record<string, AddressArg>> = {
  [ChainIds.Sonic]: {
    bwS_20: '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12',
    OS: '0xb1e25689D55734FD3ffFc939c4C3Eb52DFf8A794',
    PT_stS: '0xFCA91fEEe65DB34448A83a74f4f8970b5dddfa7c',
    PT_wOS: '0xbe1B1dd422d94f9c1784FB9356ef83A29E1A8cFa',
    S: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native token
    scUSD: '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE',
    stS: '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955',
    USDC_e: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    WETH: '0x50c42dEAcD8Fc9773493ED674b675bE577f2634b',
    wOS: '0x9F0dF7799f6FDAd409300080cfF680f5A23df4b1',
    wS: '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38',
    YT_stS: '0x0fa31f0d5a574F083E0be272a6CF807270352b3f',
    YT_wOS: '0xe16Bb6061B3567ee86285ab7780187cB39aCC55E',
    siloBws: '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12',
    roycoWalletHelpers: '0x07899ac8BE7462151d6515FCd4773DD9267c9911',
  },
};

const tokenToHolderSonic: Map<AddressArg, AddressArg> = new Map([
  // NOTE: Native Token (funded via `vm.deal(<address>, 1_000 ether)`)
  [chainIdToDeFiAddresses[ChainIds.Sonic].bwS_20, '0x8D4D19405Ba352e4767681C28936fc0a9A8C8dFe'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].OS, '0xa76Beaf111BaD5dD866fa4835D66b9aA2Eb1FdEc'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].PT_stS, '0x36804ABb20cb8c19B860d3C9bF7219a88B8fc57A'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].PT_wOS, '0xb8022c515174F41C4EF9211FE5dcFff27B01DE87'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].scUSD, '0x4D85bA8c3918359c78Ed09581E5bc7578ba932ba'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].stS, '0x396922EF30Cf012973343f7174db850c7D265278'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e, '0x322e1d5384aa4ED66AeCa770B95686271de61dc3'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].WETH, '0x427514a905fa6bEaed9A36E308Fcfa06cE54e95b'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].wOS, '0xF3c631B979EB59d8333374baA7c58B5Aff5e24D2'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].wS, '0xE223C8e92AA91e966CA31d5C6590fF7167E25801'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].YT_stS, '0xaC207c599e4A07F9A8cc5E9cf49B02E20AB7ba69'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].YT_wOS, '0xaC207c599e4A07F9A8cc5E9cf49B02E20AB7ba69'],
  [chainIdToDeFiAddresses[ChainIds.Sonic].siloBws, '0x8D4D19405Ba352e4767681C28936fc0a9A8C8dFe'],
]);

export const chainIdToTokenHolder: Map<ChainIds, Map<AddressArg, AddressArg>> = new Map([
  [ChainIds.Sonic, tokenToHolderSonic],
]);
