import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class Dahlia_SUSDC_Deposit_Shortcut implements Shortcut {
  name = 'dahlia-susd-deposit';
  description = 'Dahlia USD: Deposit USDC.e s/USDC.e receipt token';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      USDC_e: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e,
      vault: '0xe164b347de4682c7ec0adc14892fa2a8a2d43f84',
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { USDC_e, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [USDC_e],
      tokensOut: [vault],
    });

    const usdcAmount = getBalance(USDC_e, builder);

    await mintErc4626(USDC_e, vault, usdcAmount, builder);

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
