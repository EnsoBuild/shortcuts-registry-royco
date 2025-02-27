import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance } from '../../utils';
import { mintScusd } from '../rings/utils';

export class StableJack_PtScusd_Deposit_Shortcut implements Shortcut {
  name = 'stablejack-pt-scusd-deposit';
  description = 'Market 3 Deposit: usdce -> scusd-> PT-scUSD';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primaryForScusd,
      PT_scUSD: chainIdToDeFiAddresses[ChainIds.Sonic].PT_scUSD,
      scusd: chainIdToDeFiAddresses[ChainIds.Sonic].scUsd,
      usdce: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { protocol, usdce, scusd, PT_scUSD } = inputs;

    console.log(protocol);

    const builder = new Builder(chainId, client, {
      tokensIn: [usdce],
      tokensOut: [PT_scUSD],
    });
    const usdceAmount = getBalance(usdce, builder);
    const scusdAmount = await mintScusd(usdceAmount, builder);

    getStandardByProtocol('stable-jack', builder.chainId).deposit.addToBuilder(builder, {
      tokenIn: [scusd],
      tokenOut: PT_scUSD,
      amountIn: [scusdAmount],
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
