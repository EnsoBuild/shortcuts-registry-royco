import { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { DEFAULT_TX_AMOUNT_IN_VALUE } from '../constants';

const recipeMarketHubInterface = new Interface([
  'function createCampaign(address, uint256) external view returns (address)',
  'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
]);

export function getAmountInForNativeToken(
  nativeToken: AddressArg,
  tokenIn: AddressArg[],
  amountIn: BigNumberish[],
): string | undefined {
  const index = tokenIn.findIndex((token) => token.toLowerCase() === nativeToken.toLowerCase());

  if (index === -1) return DEFAULT_TX_AMOUNT_IN_VALUE;

  const amountInNativeToken = amountIn[index].toString();

  if (!amountInNativeToken || amountInNativeToken === DEFAULT_TX_AMOUNT_IN_VALUE || Number(amountInNativeToken) === 0) {
    throw new Error(`simulateShortcutOnQuoter: missing 'amountIn' for native token at index: ${index}`);
  }
  return amountInNativeToken;
}

export async function getNextWeirollWalletFromMockRecipeMarketHub(
  provider: StaticJsonRpcProvider,
  caller: AddressArg,
  mockRecipeMarketHub: AddressArg,
): Promise<AddressArg> {
  const weirollWalletBytes = await provider.call({
    to: mockRecipeMarketHub,
    data: recipeMarketHubInterface.encodeFunctionData('createCampaign', [caller, 0]),
  });

  return `0x${weirollWalletBytes.slice(26)}`;
}
