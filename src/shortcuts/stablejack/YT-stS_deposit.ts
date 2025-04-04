import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mint_stS, unwrap_wrappedNativeToken } from '../../utils';

export class StableJack_YtSts_Deposit_Shortcut implements Shortcut {
  name = 'stablejack-yt-sts-deposit';
  description = 'Market 2 Deposit: wS -> S -> stS -> YT-stS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primary,
      YT_stS: chainIdToDeFiAddresses[ChainIds.Sonic].YT_stS,
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      stS: chainIdToDeFiAddresses[ChainIds.Sonic].stS,
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { protocol, S, stS, YT_stS, wS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [YT_stS],
    });
    const amountWs = getBalance(wS, builder);

    await unwrap_wrappedNativeToken(wS, S, amountWs, builder);
    const amountS = getBalance(S, builder);

    await mint_stS(S, stS, amountS, builder);
    const amountSts = getBalance(stS, builder);

    getStandardByProtocol('stable-jack', builder.chainId).deposit.addToBuilder(builder, {
      tokenIn: [stS],
      tokenOut: YT_stS,
      amountIn: [amountSts],
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
