import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class StableJack_PtSts_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-pt-sts-redeem';
  description = 'Market 1 Redeem: PT-stS ';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primary,
      PT_stS: chainIdToDeFiAddresses[ChainIds.Sonic].PT_stS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { PT_stS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [PT_stS],
      tokensOut: [PT_stS],
    });
    const amountPtSts = getBalance(PT_stS, builder);

    await sendTokensToOwner(PT_stS, amountPtSts, builder);

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
