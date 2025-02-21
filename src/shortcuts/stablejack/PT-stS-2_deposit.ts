import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mint_stS } from '../../utils';

// NOTE: this market does not work as expected on both quoter and forge simulations
export class StableJack_PtSts_2_Deposit_Shortcut implements Shortcut {
  name = 'stablejack-pt-sts-2-deposit';
  description = 'Market 1: S -> stS -> PT-stS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      protocol: Standards.Stable_Jack.protocol.addresses!.sonic!.primary,
      PT_stS: chainIdToDeFiAddresses[ChainIds.Sonic].PT_stS,
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      stS: chainIdToDeFiAddresses[ChainIds.Sonic].stS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { protocol, S, stS, PT_stS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [S],
      tokensOut: [PT_stS],
    });

    const amountS = getBalance(S, builder);

    // const amountSts = await mint_stS(S, stS, amountS, builder);
    // TODO: this balance is not needed, better of using `mint_stS` return value
    await mint_stS(S, stS, amountS, builder);
    const amountSts = getBalance(stS, builder);

    const standard = getStandardByProtocol('stable-jack', builder.chainId);

    await standard.deposit.addToBuilder(builder, {
      tokenIn: [stS],
      tokenOut: PT_stS,
      amountIn: [amountSts], // NOTE: if I use `mint_stS` return value this complains about type
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
        return new Map([
          [this.inputs[ChainIds.Sonic].protocol, { label: 'Protocol' }],
          [this.inputs[ChainIds.Sonic].PT_stS, { label: 'PT_stS' }],
          [this.inputs[ChainIds.Sonic].S, { label: 'S (Native Token)' }],
          [this.inputs[ChainIds.Sonic].stS, { label: 'stS' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
