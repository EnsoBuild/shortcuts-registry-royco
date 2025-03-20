import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class Dahlia_SUSDC_Deposit_Shortcut implements Shortcut {
  name = 'dahlia-susdc-deposit';
  description = 'Dahlia S/USDC: Deposit USDC to receive S/USDC receipt token';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      inputToken: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e, // USDC
      vault: '0xe164b347de4682c7ec0adc14892fa2a8a2d43f84', // S/USDC Deposit Contract
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
