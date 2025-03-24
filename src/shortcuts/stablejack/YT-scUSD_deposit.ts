import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance } from '../../utils';

export class StableJack_YtScUsd_Deposit_Shortcut implements Shortcut {
  name = 'stablejack-yt-scusd-deposit';
  description = 'Market 2 Deposit: USDC.e -> YT-scUSD';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      primaryForScusd: Standards.Stable_Jack.protocol.addresses!.sonic!.primaryForScusd,
      scUsdTeller: Standards.Rings_Sc.protocol.addresses!.sonic!.scUsdTeller,
      YT_scUSD: chainIdToDeFiAddresses[ChainIds.Sonic].YT_scUSD,
      scUSD: chainIdToDeFiAddresses[ChainIds.Sonic].scUsd,
      USDC_e: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { primaryForScusd, scUsdTeller, USDC_e, scUSD, YT_scUSD } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [USDC_e],
      tokensOut: [YT_scUSD],
    });

    const amountUsde = getBalance(USDC_e, builder);
    getStandardByProtocol('rings-sc', builder.chainId).deposit.addToBuilder(builder, {
      tokenIn: [USDC_e],
      tokenOut: scUSD,
      amountIn: [amountUsde],
      primaryAddress: scUsdTeller,
    });

    const amountScusd = getBalance(scUSD, builder);
    getStandardByProtocol('stable-jack', builder.chainId).deposit.addToBuilder(builder, {
      tokenIn: [scUSD],
      tokenOut: YT_scUSD,
      amountIn: [amountScusd],
      primaryAddress: primaryForScusd,
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
        return new Map([
          [this.inputs[ChainIds.Sonic].primaryForScusd, { label: 'Protocol:scUSD' }],
          [this.inputs[ChainIds.Sonic].scUsdTeller, { label: 'scUsdTeller' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
