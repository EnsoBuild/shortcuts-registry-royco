import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, sendTokensToOwner } from '../../utils';

export class StableJack_PtWos_Redeem_Shortcut implements Shortcut {
  name = 'stablejack-pt-wos-redeem';
  description = 'Market 3 Redeem: PT-wOS -> wOS -> OS'; // TODO: missing OS -> S -> wS
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primary,
      OS: chainIdToDeFiAddresses[ChainIds.Sonic].OS,
      PT_wOS: chainIdToDeFiAddresses[ChainIds.Sonic].PT_wOS,
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      wOS: chainIdToDeFiAddresses[ChainIds.Sonic].wOS,
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { OS, PT_wOS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [PT_wOS],
      tokensOut: [OS],
    });

    const amountPtWos = getBalance(PT_wOS, builder);

    await sendTokensToOwner(PT_wOS, amountPtWos, builder);

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
          [this.inputs[ChainIds.Sonic].PT_wOS, { label: 'PT_wOS' }],
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
