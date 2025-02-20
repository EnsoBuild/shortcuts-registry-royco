import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { Silo_Ws_Deposit_Shortcut } from '../shortcuts/silo/ws_deposit';
import { StableJack_PtSts_2_Deposit_Shortcut } from '../shortcuts/stablejack/PT-stS-2_deposit';
import { StableJack_PtSts_Deposit_Shortcut } from '../shortcuts/stablejack/PT-stS_deposit';
import { StableJack_PtSts_Redeem_Shortcut } from '../shortcuts/stablejack/PT-stS_redeem';
import { StableJack_YtSts_Redeem_Shortcut } from '../shortcuts/stablejack/YT-stS_redeem';
import { Shortcut } from '../types';
import { buildVerificationHash } from './utils';

export const shortcuts: Record<string, Record<string, Shortcut>> = {
  silo: {
    ws_deposit: new Silo_Ws_Deposit_Shortcut(),
  },
  stablejack: {
    'pt-sts_deposit': new StableJack_PtSts_Deposit_Shortcut(),
    'pt-sts-2_deposit': new StableJack_PtSts_2_Deposit_Shortcut(),
    'pt-sts_redeem': new StableJack_PtSts_Redeem_Shortcut(),
    'yt-sts_redeem': new StableJack_YtSts_Redeem_Shortcut(),
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
