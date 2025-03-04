import { Builder } from '@ensofinance/shortcuts-builder';
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient';
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';

import { chainIdToDeFiAddresses } from '../../constants';
import type { Input, Output, Shortcut } from '../../types';
import { getBalance, mintErc4626, mint_OS, mint_stability, unwrap_wrappedNativeToken } from '../../utils';

export class Stability_Cwossal_Deposit_Shortcut implements Shortcut {
  name = 'stability-cwossal-deposit';
  description = 'Market: Stability - Deposit: wS -> S -> stS -> C-wOS-SAL';
  supportedChains = [ChainIds.Sonic];
  inputs: Record<number, Input> = {
    [ChainIds.Sonic]: {
      S: chainIdToDeFiAddresses[ChainIds.Sonic].S,
      OS: chainIdToDeFiAddresses[ChainIds.Sonic].OS,
      wOS: chainIdToDeFiAddresses[ChainIds.Sonic].wOS,
      wS: chainIdToDeFiAddresses[ChainIds.Sonic].wS,
      cwossal: chainIdToDeFiAddresses[ChainIds.Sonic].cwossal,
    },
  };

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient();

    const inputs = this.inputs[chainId];
    const { cwossal, OS, wOS, wS, S } = inputs;

    const builder = new Builder(chainId, client, {
      tokensIn: [wS],
      tokensOut: [cwossal],
    });

    const wsAmount = getBalance(wS, builder);

    await unwrap_wrappedNativeToken(wS, S, wsAmount, builder);
    const sAmount = getBalance(S, builder);

    await mint_OS(S, OS, sAmount, builder);
    const osAmount = getBalance(OS, builder);

    await mintErc4626(OS, wOS, osAmount, builder);
    const wosAmount = getBalance(wOS, builder);

    await mint_stability(wOS, cwossal, wosAmount, builder);

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
