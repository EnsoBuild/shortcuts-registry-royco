import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class Stability_Cwossal_Redeem_Shortcut implements Shortcut {
  name = 'stability-cwossal-redeem';
  description = 'Market: Stability Redeem C-stS-SL';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      cwossal: chainIdToDeFiAddresses[ChainIds.Sonic].cwossal,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { cwossal } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [cwossal],
      tokensOut: [cwossal],
    });
    const amountCwossal = getBalance(cwossal, builder);

    await sendTokensToOwner(cwossal, amountCwossal, builder);

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
