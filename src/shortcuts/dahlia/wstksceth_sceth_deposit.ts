import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626, mint_scToken } from '../../utils';

export class Dahlia_WstkscETH_ScETH_Deposit_Shortcut implements Shortcut {
  name = 'dahlia-wstksceth-sceth-deposit';
  description = 'Dahlia wstkscETH/scETH: Deposit wS to receive wstkscETH/scETH receipt token';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      inputToken: chainIdToDeFiAddresses[ChainIds.Sonic].wS, // wS
      scEth: chainIdToDeFiAddresses[ChainIds.Sonic].scEth, // scETH
      vault: '0x82bfed569c692fd94ac8bbfc5c867b80b4f705a8', // wstkscETH/scETH Deposit Contract
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { inputToken, scEth, vault } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [inputToken],
      tokensOut: [vault],
    });

    const inputAmount = getBalance(inputToken, builder);

    const scEthMintedAmount = await mint_scToken(inputToken, scEth, inputAmount, builder);
    await mintErc4626(scEth, vault, scEthMintedAmount, builder);

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
