import { Builder } from '@ensofinance/shortcuts-builder';
import { contractCall, walletAddress } from '@ensofinance/shortcuts-builder/helpers';
import {
  AddressArg,
  ChainIds,
  FromContractCallArg,
  NumberArg,
  Transaction,
  WalletAddressArg,
} from '@ensofinance/shortcuts-builder/types';
import { getStandardByProtocol } from '@ensofinance/shortcuts-standards';
import { GeneralAddresses, helperAddresses } from '@ensofinance/shortcuts-standards/addresses';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { chainIdToSimulationRoles } from '../constants';
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
    amountIn: [amountIn],
    primaryAddress: tokenOut,
  });

  return amountOut as FromContractCallArg;
}

export function ensureMinAmountOut(amount: NumberArg, builder: Builder) {
  const set = new Set(['minAmountOut']);
  const amountSharesMin = getSetterValue(builder, set, 'minAmountOut');

  const isCorrectAmount = builder.add({
    address: helperAddresses(builder.chainId).shortcutsHelpers,
    abi: ['function isEqualOrGreaterThan(uint256, uint256) external view returns (bool)'],
    functionName: 'isEqualOrGreaterThan',
    args: [amount, amountSharesMin],
  });

  builder.add({
    address: helperAddresses(builder.chainId).shortcutsHelpers,
    abi: ['function check(bool condition) public pure returns (bool)'],
    functionName: 'check',
    args: [isCorrectAmount],
  });
}

export async function burnTokens(token: AddressArg, amount: NumberArg, builder: Builder) {
  const erc20 = getStandardByProtocol('erc20', builder.chainId);
  await erc20.transfer.addToBuilder(builder, {
    token,
    receiver: GeneralAddresses.null,
    amount,
  });
}

export function getBalance(token: AddressArg, builder: Builder) {
  return builder.add(balanceOf(token, walletAddress()));
}

export async function buildRoycoMarketShortcut(
  shortcut: Shortcut,
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
): Promise<RoycoOutput> {
  const output = await shortcut.build(chainId, provider);

  return {
    weirollCommands: output.script.commands,
    weirollState: output.script.state,
  };
}

export function getSetterValue(builder: Builder, set: Set<string>, item: string) {
  return builder.add({
    address: chainIdToSimulationRoles.get(builder.chainId)!.setter.address!,
    abi: ['function getValue(uint256 index) external view returns (uint256)'],
    functionName: 'getValue',
    args: [findPositionInSetterInputs(set, item)],
  });
}

function findPositionInSetterInputs(set: Set<string>, item: string) {
  let index = 0;
  for (const value of set) {
    if (value === item) {
      return index;
    }
    index++;
  }
  throw new Error(`Missing input '${item}' in set: ${JSON.stringify(set)}`);
}
