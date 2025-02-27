import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class StableJack_YtScusd_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-yt-scusd-redeem';
  description = 'Market Redeem: YT-scusd';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      YT_scUSD: chainIdToDeFiAddresses[ChainIds.Sonic].YT_scUSD,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { YT_scUSD } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [YT_scUSD],
      tokensOut: [YT_scUSD],
    });
    const amountYtSts = getBalance(YT_scUSD, builder);

    await sendTokensToOwner(YT_scUSD, amountYtSts, builder);

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return {
      script: payload.shortcut as WeirollScript,
      metadata: builder.metadata,
    };
  }

  getAddressData(chainId: number): Map<AddressArg, AddressData> {
    switch (chainId) {
      case ChainIds.Sonic:
        return new Map([[this.inputs[ChainIds.Sonic].protocol, { label: 'Protocol' }]]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
