import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';

export class Pendle_LptWstkscETH_Deposit_Shortcut implements Shortcut {
  name = 'pendle-LptWstkscETH-deposit';
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
