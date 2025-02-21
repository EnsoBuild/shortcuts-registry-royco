import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class StableJack_PtSts_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-pt-sts-redeem';
  description = 'Market 1 Redeem: PT-stS -> stS -> S -> wS'; // TODO
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primary,
      PT_stS: chainIdToDeFiAddresses[ChainIds.Sonic].PT_stS,
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      stS: chainIdToDeFiAddresses[ChainIds.Sonic].stS,
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { protocol, stS, PT_stS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [PT_stS],
      // tokensOut: [wS], // TODO
      tokensOut: [stS],
    });
    const amountPtSts = getBalance(PT_stS, builder);

    getStandardByProtocol('stable-jack', builder.chainId).redeem.addToBuilder(builder, {
      tokenIn: [PT_stS],
      tokenOut: stS,
      amountIn: [amountPtSts],
      primaryAddress: protocol,
    });

    const amountSts = getBalance(stS, builder);
    await sendTokensToOwner(stS, amountSts, builder);

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
          [this.inputs[ChainIds.Sonic].PT_stS, { label: 'PT_stS' }],
          [this.inputs[ChainIds.Sonic].S, { label: 'S (Native Token)' }],
          [this.inputs[ChainIds.Sonic].stS, { label: 'stS' }],
          [this.inputs[ChainIds.Sonic].wS, { label: 'wS' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
