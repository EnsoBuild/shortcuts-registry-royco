import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class StableJack_YtWos_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-yt-wos-redeem';
  description = 'Market 4 Redeem: YT-wOS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primary,
      YT_wOS: chainIdToDeFiAddresses[ChainIds.Sonic].YT_wOS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { YT_wOS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [YT_wOS],
      tokensOut: [YT_wOS],
    });

    const amountYtWos = getBalance(YT_wOS, builder);

    await sendTokensToOwner(YT_wOS, amountYtWos, builder);

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
        return new Map([
          [this.inputs[ChainIds.Sonic].protocol, { label: 'Protocol' }],
          [this.inputs[ChainIds.Sonic].YT_wOS, { label: 'YT_wOS' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
