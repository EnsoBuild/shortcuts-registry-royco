import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626 } from '../../utils';

export class Silo_BUSDCe_Deposit_Shortcut implements Shortcut {
  name = 'silo-busdce-deposit';
  description = 'Market 1 Deposit: USDC_e -> bUSDCe';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      USDC_e: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e,
      vault: '0x6030aD53d90ec2fB67F3805794dBB3Fa5FD6Eb64', // bUSDCe
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
    const usdceAmount = getBalance(USDC_e, builder);

    await mintErc4626(USDC_e, vault, usdceAmount, builder);

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
