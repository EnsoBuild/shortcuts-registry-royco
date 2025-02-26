import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';
import { mintScusd, mintStkscusd } from './utils';

export class Rings_Wstkscusd_Deposit_Shortcut implements Shortcut {
  name = 'rings-wstkscusd-deposit';
  description = 'Rings Market Deposit: usdce -> wstkscusd';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      usdce: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e,
      scusd: chainIdToDeFiAddresses[ChainIds.Sonic].scUsd,
      stkscusd: chainIdToDeFiAddresses[ChainIds.Sonic].stkscusd,
      wstkscusd: chainIdToDeFiAddresses[ChainIds.Sonic].wstkscusd,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { usdce, stkscusd, wstkscusd } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [usdce],
      tokensOut: [wstkscusd],
    });

    const usdceAmount = getBalance(usdce, builder);

    const scusdAmount = await mintScusd(usdceAmount, builder);
    const stkscusdAmount = await mintStkscusd(scusdAmount, builder);

    await mintErc4626(stkscusd, wstkscusd, stkscusdAmount, builder);

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
          [this.inputs[ChainIds.Sonic].usdce, { label: 'usdce' }],
          [this.inputs[ChainIds.Sonic].scusd, { label: 'scusd' }],
          [this.inputs[ChainIds.Sonic].stkscusd, { label: 'stkscusd' }],
          [this.inputs[ChainIds.Sonic].wstkscusd, { label: 'wstkscusd' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
  getTokenHolder(chainId: number): Map<AddressArg, AddressArg> {
    const tokenToHolder = chainIdToTokenHolder.get(chainId);
    if (!tokenToHolder) throw new Error(`Unsupported 'chainId': ${chainId}`);

    return tokenToHolder as Map<AddressArg, AddressArg>;
  }
}
