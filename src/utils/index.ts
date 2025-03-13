import { Builder } from '@ensofinance/shortcuts-builder';
import { contractCall, getChainName, walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import {
  AddressArg,
  ChainIds,
  FromContractCallArg,
  NumberArg,
  Transaction,
  WalletAddressArg,
} from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { GeneralAddresses, helperAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { addAction, getAmountOutFromBytes, getForks, percentMul } from '@ensofinance/shortcuts-standards/helpers';
import { BigNumber } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { chainIdToDeFiAddresses, chainIdToSimulationRoles } from '../constants';
import { getNativeToken } from '../helpers/utils';
import type { RoycoOutput, Shortcut, SimulationResult } from '../types';

export async function prepareResponse(
  /* eslint-disable @typescript-eslint/no-explicit-any */
  simulationResult: any,
  transaction: Transaction,
): Promise<SimulationResult> {
  return {
    logs: simulationResult.logs,
    simulationURL: simulationResult.simulationURL,
    transaction,
  };
}

export function balanceOf(token: AddressArg, owner: WalletAddressArg) {
  return contractCall({
    address: token,
    functionName: 'balanceOf',
    abi: ['function balanceOf(address) external view returns (uint256)'],
    args: [owner],
  });
}

export async function mintErc4626(tokenIn: AddressArg, tokenOut: AddressArg, amountIn: NumberArg, builder: Builder) {
  const erc4626 = getStandardByProtocol('erc4626', builder.chainId);
  const { amountOut } = await erc4626.deposit.addToBuilder(builder, {
    tokenIn,
    tokenOut,
    amountIn,
    primaryAddress: tokenOut,
  });

  return amountOut as FromContractCallArg;
}

export async function redeemErc4626(tokenIn: AddressArg, tokenOut: AddressArg, amountIn: NumberArg, builder: Builder) {
  const erc4626 = getStandardByProtocol('erc4626', builder.chainId);
  const { amountOut } = await erc4626.redeem.addToBuilder(builder, {
    tokenIn,
    tokenOut,
    amountIn,
    primaryAddress: tokenIn,
  });

  return amountOut as FromContractCallArg;
}

export async function burnTokens(token: AddressArg, amount: NumberArg, builder: Builder) {
  const erc20 = getStandardByProtocol('erc20', builder.chainId);
  await erc20.transfer.addToBuilder(builder, {
    token,
    receiver: GeneralAddresses.null,
    amount,
  });
}

export function getWalletOwner(builder: Builder) {
  return builder.add({
    address: chainIdToSimulationRoles.get(builder.chainId)?.roycoWalletHelpers.address as AddressArg,
    abi: ['function owner() external view returns (address)'],
    functionName: 'owner',
    args: [],
  });
}

export async function sendTokensToOwner(token: AddressArg, amount: NumberArg, builder: Builder) {
  const owner = getWalletOwner(builder);
  return builder.add({
    address: token,
    functionName: 'transfer',
    abi: ['function transfer(address,uint256)'],
    args: [owner, amount],
  });
}

export async function claimPendleRewards(market: AddressArg, builder: Builder) {
  const routerAddress = chainIdToDeFiAddresses[builder.chainId].pendleRouterV4;
  const abi = [
    {
      inputs: [
        {
          internalType: 'contract IStandardizedYield[]',
          name: 'SYs',
          type: 'address[]',
        },
        {
          components: [
            {
              internalType: 'contract IStandardizedYield',
              name: 'YT',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenOut',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'minAmountOut',
              type: 'uint256',
            },
          ],
          internalType: 'struct RedeemYtIncomeToTokenStruct[]',
          name: 'YTs',
          type: 'tuple[]',
        },
        {
          internalType: 'contract IPMarket[]',
          name: 'markets',
          type: 'address[]',
        },
        {
          internalType: 'contract IPSwapAggregator',
          name: 'pendleSwap',
          type: 'address',
        },
        {
          components: [
            {
              internalType: 'bytes',
              name: 'swapData',
              type: 'bytes',
            },
            {
              internalType: 'address',
              name: 'tokenIn',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'tokenOut',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'minAmountOut',
              type: 'uint256',
            },
          ],
          internalType: 'struct SwapDataExtra[]',
          name: 'swaps',
          type: 'tuple[]',
        },
      ],
      name: 'redeemDueInterestAndRewardsV2',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'netOutFromSwaps',
          type: 'uint256[]',
        },
        {
          internalType: 'uint256[]',
          name: 'netInterests',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ];

  builder.add({
    address: routerAddress,
    abi: JSON.stringify(abi),
    functionName: 'redeemDueInterestAndRewardsV2',
    noArgumentsCheck: true,
    args: [
      [], // SYs: empty address[]
      [], // YTs: empty RedeemYtIncomeToTokenStruct[]
      [market], // markets: IPMarket[] containing your wstethMarket address
      '0x313e7ef7d52f5c10ac04ebaa4d33cdc68634c212', // pendleSwap address
      [], // swaps: empty SwapDataExtra[]
    ],
  });
}

// NOTE: alternative to 'import {balance} from "@ensofinance/shortcuts-standards/helpers"'
export function getBalance(token: AddressArg, builder: Builder, account = walletAddress()) {
  if (token.toLowerCase() !== getNativeToken(builder.chainId).toLowerCase())
    return builder.add(balanceOf(token, account));

  return builder.add({
    address: helperAddresses(builder.chainId).shortcutsHelpers,
    abi: ['function getBalance(address) external view returns (uint256)'],
    functionName: 'getBalance',
    args: [account],
  });
}

export async function buildRoycoMarketShortcut(
  shortcut: Shortcut,
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
): Promise<RoycoOutput> {
  const output = await shortcut.build(chainId, provider);

  return {
    commands: output.script.commands,
    state: output.script.state,
  };
}

export async function wrap_nativeToken(
  tokenIn: AddressArg,
  tokenOut: AddressArg,
  amountIn: NumberArg,
  builder: Builder,
) {
  const standard = getStandardByProtocol('wrapped-native', builder.chainId);
  const { amountOut } = await standard.deposit.addToBuilder(builder, {
    tokenIn,
    tokenOut,
    amountIn,
    primaryAddress: tokenOut,
  });

  return amountOut as FromContractCallArg;
}

export async function unwrap_wrappedNativeToken(
  tokenIn: AddressArg,
  tokenOut: AddressArg,
  amountIn: NumberArg,
  builder: Builder,
) {
  const standard = getStandardByProtocol('wrapped-native', builder.chainId);
  const { amountOut } = await standard.redeem.addToBuilder(builder, {
    tokenIn,
    tokenOut,
    amountIn,
    primaryAddress: tokenIn,
  });

  return amountOut as FromContractCallArg;
}

export async function mint_stS(tokenIn: AddressArg, tokenOut: AddressArg, amountIn: NumberArg, builder: Builder) {
  const standard = getStandardByProtocol('beets-sts', builder.chainId);
  const { amountOut } = await standard.deposit.addToBuilder(builder, {
    tokenIn,
    tokenOut,
    amountIn,
    primaryAddress: Standards.Beets_Sts.protocol.addresses![getChainName(builder.chainId)]!.primary as AddressArg,
  });

  return amountOut as FromContractCallArg;
}

export async function mint_OS(tokenIn: AddressArg, tokenOut: AddressArg, amountIn: NumberArg, builder: Builder) {
  const forksRocketPool = getForks(Standards.Rocketpool);
  const originOs = forksRocketPool['origin-os'];

  const standard = getStandardByProtocol('origin-os', builder.chainId);
  const { amountOut } = await standard.deposit.addToBuilder(builder, {
    tokenIn,
    tokenOut,
    amountIn,
    primaryAddress: originOs![getChainName(builder.chainId)]!.primary as AddressArg,
  });

  return amountOut as FromContractCallArg;
}

export async function mint_stability(tokenIn: AddressArg, tokenOut: AddressArg, amountIn: NumberArg, builder: Builder) {
  const previewDepositAssetsRes = builder.add({
    address: tokenOut,
    functionName: 'previewDepositAssets',
    abi: [
      'function previewDepositAssets(address[] assets, uint256[] amountsMax) external view returns (uint256[] amountsConsumed, uint256 sharesOut, uint256 valueOut)',
    ],
    args: [[tokenIn], [amountIn]],
    noArgumentsCheck: true,
  });

  const previewSharesOut = getAmountOutFromBytes(builder, previewDepositAssetsRes, 1);
  const minOutPercentFactor = BigNumber.from(10000).sub(500);
  const minAmountOut = percentMul(previewSharesOut, minOutPercentFactor, builder);

  const action = contractCall({
    address: tokenOut,
    functionName: 'depositAssets',
    abi: ['function depositAssets(address[] assets, uint256[] amountsMax, uint256 minAmountOut, address receiver)'],
    args: [[tokenIn], [amountIn], minAmountOut, walletAddress()],
    noArgumentsCheck: true,
  });

  const approvals = {
    tokens: [tokenIn],
    amounts: [amountIn],
    spender: tokenOut,
  };

  const amountOut = addAction({
    builder,
    action,
    approvals,
  });

  return amountOut as unknown as FromContractCallArg;
}
