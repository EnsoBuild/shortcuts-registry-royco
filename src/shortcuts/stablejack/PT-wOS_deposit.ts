import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { Standards, getStandardByProtocol } from '@ensofinance/shortcuts-standards';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626, mint_OS, unwrap_wrappedNativeToken } from '../../utils';

export class StableJack_PtWos_Deposit_Shortcut implements Shortcut {
  name = 'stablejack-pt-wos-deposit';
  description = 'Market 1 Deposit: wS -> S -> OS -> wOS -> PT-wOS';
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
    const { protocol, OS, PT_wOS, S, wOS, wS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [PT_wOS],
    });
    const amountWs = getBalance(wS, builder);

    await unwrap_wrappedNativeToken(wS, S, amountWs, builder);
    const amountS = getBalance(S, builder);

    await mint_OS(S, OS, amountS, builder);
    const amountOs = getBalance(OS, builder);

    await mintErc4626(OS, wOS, amountOs, builder);
    const amountWos = getBalance(wOS, builder);

    getStandardByProtocol('stable-jack', builder.chainId).deposit.addToBuilder(builder, {
      tokenIn: [wOS],
      tokenOut: PT_wOS,
      amountIn: [amountWos],
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
