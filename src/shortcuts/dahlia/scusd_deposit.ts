import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, FromContractCallArg, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class Dahlia_ScUSD_Deposit_Shortcut implements Shortcut {
  name = 'dahlia-scusd-deposit';
  description = 'Dahlia scUSD: Deposit USDC.e -> scUSD -> scUSD/USDC.e receipt token';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      USDC_e: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e, // USDC.e
      scUsd: chainIdToDeFiAddresses[ChainIds.Sonic].scUsd, // scUSD
      vault: '0xe164b347de4682c7ec0adc14892fa2a8a2d43f84', // scUSD/USDC.e Deposit Contract
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { USDC_e, scUsd, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [USDC_e],
      tokensOut: [vault],
    });

    // Get the USDC.e amount
    const usdcAmount = getBalance(USDC_e, builder);

    // Mint scUSD from USDC.e
    const scUsdAmount = await mintScUsd(usdcAmount, builder);

    // Deposit scUSD into the vault
    await mintErc4626(scUsd, vault, scUsdAmount, builder);

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return {
      script: payload.shortcut as WeirollScript,
      metadata: builder.metadata,
    };
  }
}

// Helper function to mint scUSD from USDC.e
async function mintScUsd(amountIn: FromContractCallArg, builder: Builder) {
  const primaryAddress = chainIdToDeFiAddresses[builder.chainId].scUsdTeller;
  const tokenIn = chainIdToDeFiAddresses[builder.chainId].USDC_e;
  const tokenOut = chainIdToDeFiAddresses[builder.chainId].scUsd;

  const standard = getStandardByProtocol('rings-scusd', builder.chainId);
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
