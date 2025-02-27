import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class StableJack_PtScusd_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-pt-scusd-redeem';
  description = 'Market 3 Deposit: PT-scUsd';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      PT_scUSD: chainIdToDeFiAddresses[ChainIds.Sonic].PT_scUSD,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { PT_scUSD } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [PT_scUSD],
      tokensOut: [PT_scUSD],
    });

    const amountPtWos = getBalance(PT_scUSD, builder);
    await sendTokensToOwner(PT_scUSD, amountPtWos, builder);

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
