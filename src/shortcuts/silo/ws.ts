import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class SiloWsShortcut implements Shortcut {
  name = 'silo-ws';
  description = '';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
      vault: '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12',
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { wS, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [vault],
    });
    const wsAmount = getBalance(wS, builder);

    await mintErc4626(wS, vault, wsAmount, builder);

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
          [this.inputs[ChainIds.Sonic].ws, { label: 'ERC20:ws' }],
          [this.inputs[ChainIds.Sonic].vault, { label: 'ERC20:Silo Vault' }],
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
