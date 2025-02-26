import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626, mint_OS, unwrap_wrappedNativeToken } from '../../utils';

export class StableJack_YtWos_Deposit_Shortcut implements Shortcut {
  name = 'stablejack-yt-wos-deposit';
  description = 'Market 1 Deposit: wS -> S -> OS -> wOS -> YT-wOS';
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
    const { protocol, OS, YT_wOS, S, wOS, wS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [YT_wOS],
    });
    const amountWs = getBalance(wS, builder);

    await unwrap_wrappedNativeToken(wS, S, amountWs, builder);
    const amountS = getBalance(S, builder);

    await mint_OS(S, OS, amountS, builder);
    const amountOs = getBalance(OS, builder);

    await mintErc4626(OS, wOS, amountOs, builder);
    const amountWos = getBalance(wOS, builder);

    getStandardByProtocol('stable-jack', builder.chainId).deposit.addToBuilder(builder, {
      tokenIn: [wOS],
      tokenOut: YT_wOS,
      amountIn: [amountWos],
      primaryAddress: protocol,
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

  getAddressData(chainId: number): Map<AddressArg, AddressData> {
    switch (chainId) {
      case ChainIds.Sonic:
        return new Map([[this.inputs[ChainIds.Sonic].protocol, { label: 'Protocol' }]]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
