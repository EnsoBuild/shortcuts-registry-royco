import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class Dahlia_ScUSD_Redeem_Shortcut implements Shortcut {
  name = 'dahlia-scusd-redeem';
  description = 'Dahlia scUSD: Redeem scUSD/USDC.e receipt token to get back USDC.e';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: '0xe164b347de4682c7ec0adc14892fa2a8a2d43f84', // scUSD/USDC.e Deposit Contract
      scUsd: chainIdToDeFiAddresses[ChainIds.Sonic].scUsd, // scUSD
      USDC_e: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e, // USDC.e
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { vault, USDC_e } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [vault],
      tokensOut: [USDC_e],
    });

    // Redeem the vault tokens to get USDC.e directly
    const vaultAmount = getBalance(vault, builder);
    await redeemErc4626(vault, USDC_e, vaultAmount, builder);

    // Send the USDC.e to the owner
    const outputAmount = getBalance(USDC_e, builder);
    await sendTokensToOwner(USDC_e, outputAmount, builder);

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
