import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mint_stS, unwrap_wrappedNativeToken } from '../../utils';

export class Beets_Sts_Deposit_Shortcut implements Shortcut {
  name = 'beets-sts-deposit';
  description = 'Market: Beets - Deposit: wS -> S -> stS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      stS: chainIdToDeFiAddresses[ChainIds.Sonic].stS,
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { S, stS, wS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [stS],
    });
    const amountWs = getBalance(wS, builder);

    await unwrap_wrappedNativeToken(wS, S, amountWs, builder);
    const amountS = getBalance(S, builder);

    await mint_stS(S, stS, amountS, builder);

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
          [this.inputs[ChainIds.Sonic].S, { label: 'S (Native Token)' }],
          [this.inputs[ChainIds.Sonic].stS, { label: 'stS' }],
          [this.inputs[ChainIds.Sonic].wS, { label: 'wS' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
