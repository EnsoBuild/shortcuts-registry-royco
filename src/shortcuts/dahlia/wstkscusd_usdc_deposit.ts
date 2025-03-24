import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class Dahlia_WstkscUSD_USDC_Deposit_Shortcut implements Shortcut {
  name = 'dahlia-wstkscusd-usdc-deposit';
  description = 'Dahlia wstkscUSD/USDC: Deposit USDC to receive wstkscUSD/USDC receipt token';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      inputToken: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e, // USDC
      vault: '0x4efc39b642b905e721e28304d609b4b89186c165', // wstkscUSD/USDC Deposit Contract
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
