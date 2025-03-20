import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class Dahlia_WstkscUSD_ScUSD_Deposit_Shortcut implements Shortcut {
  name = 'dahlia-wstkscusd-scusd-deposit';
  description = 'Dahlia wstkscUSD/scUSD: Deposit scUSD to receive wstkscUSD/scUSD receipt token';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      inputToken: chainIdToDeFiAddresses[ChainIds.Sonic].scUsd, // scUSD
      vault: '0xb68B61dC12872a0AB0b92F6563E2E5Ec1657B2AC', // wstkscUSD/scUSD Deposit Contract
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { inputToken, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [inputToken],
      tokensOut: [vault],
    });

    const inputAmount = getBalance(inputToken, builder);
    await mintErc4626(inputToken, vault, inputAmount, builder);

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
