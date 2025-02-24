import { Builder } from '@ensofinance/shortcuts-builder';
import { contractCall } from '@ensofinance/shortcuts-builder/helpers';
import { FromContractCallArg, NumberArg } from '@ensofinance/shortcuts-builder/types';
import { addApprovals } from '@ensofinance/shortcuts-standards/helpers/shortcuts';

import { chainIdToDeFiAddresses } from '../../constants';
import { getBalance } from '../../utils';

export async function mintScusd(amountIn: NumberArg, builder: Builder) {
  const primaryAddress = chainIdToDeFiAddresses[builder.chainId].scUsdTeller;
  const tokenIn = chainIdToDeFiAddresses[builder.chainId].USDC_e;
  const tokenOut = chainIdToDeFiAddresses[builder.chainId].scUsd;
  console.log(tokenOut);

  await addApprovals(builder, {
    tokens: [tokenIn],
    spender: tokenOut,
    amounts: [amountIn],
  });

  const action = contractCall({
    address: primaryAddress,
    functionName: 'deposit',
    abi: [
      'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint) external payable returns (uint256 shares)',
    ],
    args: [tokenIn, amountIn, 0],
  });

  builder.add(action);

  const amountOut = getBalance(tokenOut, builder);

  return amountOut as FromContractCallArg;
}
