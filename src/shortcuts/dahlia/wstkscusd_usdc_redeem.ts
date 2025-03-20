import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, redeemErc4626, sendTokensToOwner } from '../../utils';

export class Dahlia_WstkscUSD_USDC_Redeem_Shortcut implements Shortcut {
  name = 'dahlia-wstkscusd-usdc-redeem';
  description = 'Dahlia wstkscUSD/USDC: Redeem wstkscUSD/USDC receipt token to get back USDC';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      vault: '0x4efc39b642b905e721e28304d609b4b89186c165', // wstkscUSD/USDC Deposit Contract
      outputToken: chainIdToDeFiAddresses[ChainIds.Sonic].USDC_e, // USDC
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
