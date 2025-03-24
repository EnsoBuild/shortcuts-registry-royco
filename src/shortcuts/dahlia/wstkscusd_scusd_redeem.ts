import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class Dahlia_WstkscUSD_ScUSD_Redeem_Shortcut implements Shortcut {
  name = 'dahlia-wstkscusd-scusd-redeem';
  description = 'Dahlia wstkscUSD/scUSD: Redeem wstkscUSD/scUSD receipt token to get back scUSD';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: '0xb68B61dC12872a0AB0b92F6563E2E5Ec1657B2AC', // wstkscUSD/scUSD Deposit Contract
      outputToken: chainIdToDeFiAddresses[ChainIds.Sonic].scUsd, // scUSD
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { vault, outputToken } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [vault],
      tokensOut: [outputToken],
    });

    const vaultAmount = getBalance(vault, builder);
    await redeemErc4626(vault, outputToken, vaultAmount, builder);

    const outputAmount = getBalance(outputToken, builder);
    await sendTokensToOwner(outputToken, outputAmount, builder);

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    });

    return {
      script: payload.shortcut as WeirollScript,
      metadata: builder.metadata,
    };
  }
}
