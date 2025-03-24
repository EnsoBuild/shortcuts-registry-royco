import { Builder } from '@ensofinance/shortcuts-builder';
import { FromContractCallArg } from '@ensofinance/shortcuts-builder/types';
import { getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';

export async function mintStkscusd(amountIn: FromContractCallArg, builder: Builder) {
  const primaryAddress = chainIdToDeFiAddresses[builder.chainId].stkscusdTeller;
  const tokenIn = chainIdToDeFiAddresses[builder.chainId].scUsd;
  const tokenOut = chainIdToDeFiAddresses[builder.chainId].stkscusd;

  const standard = getStandardByProtocol('rings-sc-staked', builder.chainId);
  const { amountOut } = await standard.deposit.addToBuilder(
    builder,
    {
      tokenIn,
      tokenOut,
      amountIn,
      primaryAddress,
    },
    ['amountOut'],
  );

  return amountOut as FromContractCallArg;
}
