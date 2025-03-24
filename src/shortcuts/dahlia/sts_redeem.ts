import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class Dahlia_StS_Redeem_Shortcut implements Shortcut {
  name = 'dahlia-sts-redeem';
  description = 'Dahlia stS/S: Redeem stS/S receipt token to get back wS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: '0x134c82ba00a7d6dc111199b081a377a5d4ba911a',
      outputToken: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { vault, outputToken } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [vault],
      tokensOut: [outputToken],
    });

    const vaultAmount = getBalance(vault, builder);
    await redeemErc4626(vault, outputToken, vaultAmount, builder);

    const outputAmount = getBalance(outputToken, builder);
    await sendTokensToOwner(outputToken, outputAmount, builder);

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
