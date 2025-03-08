import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class Silo_BUSDCe_Redeem_Shortcut implements Shortcut {
  name = 'silo-busdce-redeem';
  description = 'Market 1 Redeem: bUSDCe -> USDC_e';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: '0x6030aD53d90ec2fB67F3805794dBB3Fa5FD6Eb64', // bUSDCe
      USDC_e: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { USDC_e, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [vault],
      tokensOut: [USDC_e],
    });
    const vaultAmount = getBalance(vault, builder);
    await redeemErc4626(vault, USDC_e, vaultAmount, builder);

    const usdceAmount = getBalance(USDC_e, builder);
    await sendTokensToOwner(USDC_e, usdceAmount, builder);

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
