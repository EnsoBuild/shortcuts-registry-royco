import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class StableJack_YtWos_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-yt-wos-redeem';
  description = 'Market 4 Redeem: YT-wOS -> wOS -> OS'; // TODO: missing OS -> S -> wS
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primary,
      OS: chainIdToDeFiAddresses[ChainIds.Sonic].OS,
      YT_wOS: chainIdToDeFiAddresses[ChainIds.Sonic].YT_wOS,
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      wOS: chainIdToDeFiAddresses[ChainIds.Sonic].wOS,
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { protocol, OS, YT_wOS, wOS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [YT_wOS],
      tokensOut: [OS],
    });

    const amountYtWos = getBalance(YT_wOS, builder);
    getStandardByProtocol('stable-jack', builder.chainId).redeem.addToBuilder(builder, {
      tokenIn: [YT_wOS],
      tokenOut: wOS,
      amountIn: [amountYtWos],
      primaryAddress: protocol,
    });

    const amountWos = getBalance(wOS, builder);
    await redeemErc4626(wOS, OS, amountWos, builder);

    const amountOs = getBalance(OS, builder);
    await sendTokensToOwner(OS, amountOs, builder);

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
          [this.inputs[ChainIds.Sonic].OS, { label: 'OS' }],
          [this.inputs[ChainIds.Sonic].S, { label: 'S (Native Token)' }],
          [this.inputs[ChainIds.Sonic].wOS, { label: 'wOS' }],
          [this.inputs[ChainIds.Sonic].wS, { label: 'wS' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
