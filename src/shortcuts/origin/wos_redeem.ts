import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses, chainIdToTokenHolder } from '../../constants';
import type { AddressData, Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class Origin_Wos_Redeem_Shortcut implements Shortcut {
  name = 'origin-wos-redeem';
  description = 'Market 1 Redeem: bwOS-20 -> wS';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12',
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
      wOS: chainIdToDeFiAddresses[ChainIds.Sonic].wOS,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { vault, wOS } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [vault],
      tokensOut: [wOS],
    });
    const vaultAmount = getBalance(vault, builder);
    await redeemErc4626(vault, wOS, vaultAmount, builder);
    const wOSAmount = getBalance(wOS, builder);
    await sendTokensToOwner(wOS, wOSAmount, builder);

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
          [this.inputs[ChainIds.Sonic].wS, { label: 'ERC20:wS' }],
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
