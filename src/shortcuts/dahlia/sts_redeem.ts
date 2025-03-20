import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, wrap_nativeToken } from '../../utils';

export class Dahlia_StS_Redeem_Shortcut implements Shortcut {
  name = 'dahlia-sts-redeem';
  description = 'Dahlia stS/S: Redeem stS/S receipt token to get back S -> wS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: '0x134c82ba00a7d6dc111199b081a377a5d4ba911a', // stS/S Deposit Contract
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S, // S (Native Token)
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS, // wS
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { vault, S, wS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [vault],
      tokensOut: [wS],
    });

    // Redeem the vault tokens to get S
    const vaultAmount = getBalance(vault, builder);
    await redeemErc4626(vault, S, vaultAmount, builder);

    // Wrap S to get wS
    const sAmount = getBalance(S, builder);
    await wrap_nativeToken(S, wS, sAmount, builder);

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
