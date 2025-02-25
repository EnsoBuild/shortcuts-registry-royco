import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626, mint_OS, unwrap_wrappedNativeToken } from '../../utils';

export class Origin_Wos_Deposit_Shortcut implements Shortcut {
  name = 'origin-wos-deposit';
  description = 'Market 1 Deposit: wS -> bwOS-22';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      OS: chainIdToDeFiAddresses[ChainIds.Sonic].OS,
      wOS: chainIdToDeFiAddresses[ChainIds.Sonic].wOS,
      vault: chainIdToDeFiAddresses[ChainIds.Sonic].bwOS_22,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { wS, vault, S, OS, wOS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [vault],
    });
    const wsAmount = getBalance(wS, builder);

    await unwrap_wrappedNativeToken(wS, S, wsAmount, builder);
    const sAmount = getBalance(S, builder);

    await mint_OS(S, OS, sAmount, builder);
    const osAmount = getBalance(OS, builder);

    await mintErc4626(OS, wOS, osAmount, builder);
    const wosAmount = getBalance(wOS, builder);

    await mintErc4626(wOS, vault, wosAmount, builder);

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
          [this.inputs[ChainIds.Sonic].wS, { label: 'wS' }],
          [this.inputs[ChainIds.Sonic].vault, { label: 'bwOS-22' }],
        ]);
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }
}
