import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class Pendle_LptWstkscETH_Redeem_Shortcut implements Shortcut {
  name = 'pendle-LptWstkscETH-redeem';
  description = 'Deposit Pendle LP';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      lptWstkscETH: chainIdToDeFiAddresses[ChainIds.Sonic].lptWstkscETH,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { lptWstkscETH } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [lptWstkscETH],
      tokensOut: [lptWstkscETH],
    });

    const amountLptWstkscETH = getBalance(lptWstkscETH, builder);
    await sendTokensToOwner(lptWstkscETH, amountLptWstkscETH, builder);

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
