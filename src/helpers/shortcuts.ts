import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { Silo_Ws_Shortcut } from '../shortcuts/silo/ws';
import { Shortcut } from '../types';
import { buildVerificationHash } from './utils';

export const shortcuts: Record<string, Record<string, Shortcut>> = {
  silo: {
    ws: new Silo_Ws_Shortcut(),
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
