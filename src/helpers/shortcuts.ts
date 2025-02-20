import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { Silo_Ws_Deposit_Shortcut } from '../shortcuts/silo/ws-deposit';
import { Silo_Ws_Redeem_Shortcut } from '../shortcuts/silo/ws-redeem';
import { StableJack_PtSts_Shortcut } from '../shortcuts/stablejack/PT-stS';
import { StableJack_PtSts_2_Shortcut } from '../shortcuts/stablejack/PT-stS-2';
import { Shortcut } from '../types';
import { buildVerificationHash } from './utils';

export const shortcuts: Record<string, Record<string, Shortcut>> = {
  silo: {
    'ws-deposit': new Silo_Ws_Deposit_Shortcut(),
    'ws-redeem': new Silo_Ws_Redeem_Shortcut(),
  },
  stablejack: {
    'pt-sts': new StableJack_PtSts_Shortcut(),
    'pt-sts-2': new StableJack_PtSts_2_Shortcut(),
  },
};

export async function buildShortcutsHashMap(
  chainId: number,
  provider: StaticJsonRpcProvider,
): Promise<Record<string, Shortcut>> {
  const shortcutsArray = [];
  for (const protocol in shortcuts) {
    for (const market in shortcuts[protocol]) {
      const shortcut = shortcuts[protocol][market];
      if (shortcut.inputs[chainId]) shortcutsArray.push(shortcuts[protocol][market]);
    }
  }
  const hashArray = await Promise.all(
    shortcutsArray.map(async (shortcut) => {
      const { script, metadata } = await shortcut.build(chainId, provider);
      return buildVerificationHash(metadata.tokensOut![0], script);
    }),
  );
  const shortcutsHashMap: Record<string, Shortcut> = {};
  for (const i in shortcutsArray) {
    shortcutsHashMap[hashArray[i]] = shortcutsArray[i];
  }
  return shortcutsHashMap;
}
