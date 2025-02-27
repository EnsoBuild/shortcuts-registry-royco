import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class StableJack_YtScUsd_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-yt-scusd-redeem';
  description = 'Market 1 Redeem: YT-scUSD';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      primaryForScusd: Standards.Stable_Jack.protocol.addresses!.sonic!.primaryForScusd,
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
    const amountYtScusd = getBalance(YT_scUSD, builder);

    await sendTokensToOwner(YT_scUSD, amountYtScusd, builder);

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
        return new Map([[this.inputs[ChainIds.Sonic].primaryForScusd, { label: 'Protocol:scUSD' }]]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
