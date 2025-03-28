import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class Origin_Wos_Redeem_Shortcut implements Shortcut {
  name = 'origin-wos-redeem';
  description = 'Market 1 Redeem: bwOS-22 -> wOS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: chainIdToDeFiAddresses[ChainIds.Sonic].bwOS_22,
      wOS: chainIdToDeFiAddresses[ChainIds.Sonic].wOS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { vault, wOS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [vault],
      tokensOut: [wOS],
    });
    const vaultAmount = getBalance(vault, builder);
    await redeemErc4626(vault, wOS, vaultAmount, builder);

    const wOSAmount = getBalance(wOS, builder);
    await sendTokensToOwner(wOS, wOSAmount, builder);

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
