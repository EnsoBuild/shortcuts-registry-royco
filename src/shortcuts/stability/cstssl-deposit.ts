import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mint_CstSSL, mint_stS, unwrap_wrappedNativeToken } from '../../utils';

export class Stability_CstSSL_Deposit_Shortcut implements Shortcut {
  name = 'stability-cstssl-deposit';
  description = 'Market: Stability - Deposit: wS -> S -> stS -> C-stS-SL';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      stS: chainIdToDeFiAddresses[ChainIds.Sonic].stS,
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
      CstSSL: chainIdToDeFiAddresses[ChainIds.Sonic].CstSSL,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { CstSSL, stS, wS, S } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [CstSSL],
    });

    const amountWs = getBalance(wS, builder);

    await unwrap_wrappedNativeToken(wS, S, amountWs, builder);
    const amountS = getBalance(S, builder);

    await mint_stS(S, stS, amountS, builder);

    const amountStS = getBalance(stS, builder);
    await mint_CstSSL(stS, CstSSL, amountStS, builder);

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
