import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class Dahlia_StS_Deposit_Shortcut implements Shortcut {
  name = 'dahlia-sts-deposit';
  description = 'Dahlia stS/S: Deposit wS -> stS/S receipt token';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
      vault: '0x134c82ba00a7d6dc111199b081a377a5d4ba911a',
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { wS, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [vault],
    });

    const amountWs = getBalance(wS, builder);

    await mintErc4626(wS, vault, amountWs, builder);

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
