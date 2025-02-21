import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { Silo_Ws_Deposit_Shortcut } from '../shortcuts/silo/ws_deposit';
import { Silo_Ws_Redeem_Shortcut } from '../shortcuts/silo/ws_redeem';
import { StableJack_PtSts_2_Deposit_Shortcut } from '../shortcuts/stablejack/PT-stS-2_deposit';
import { StableJack_PtSts_Deposit_Shortcut } from '../shortcuts/stablejack/PT-stS_deposit';
import { StableJack_PtSts_Redeem_Shortcut } from '../shortcuts/stablejack/PT-stS_redeem';
import { StableJack_YtSts_Deposit_Shortcut } from '../shortcuts/stablejack/YT-stS_deposit';
import { StableJack_YtSts_Redeem_Shortcut } from '../shortcuts/stablejack/YT-stS_redeem';
import { BuiltShortcut, Shortcut } from '../types';

export const supportedShortcuts = [
  Silo_Ws_Deposit_Shortcut,
  Silo_Ws_Redeem_Shortcut,
  StableJack_PtSts_Deposit_Shortcut,
  StableJack_PtSts_2_Deposit_Shortcut,
  StableJack_PtSts_Redeem_Shortcut,
  StableJack_YtSts_Deposit_Shortcut,
  StableJack_YtSts_Redeem_Shortcut,
];

export async function buildShortcut(
  chainId: ChainIds,
  provider: StaticJsonRpcProvider,
  shortcut: Shortcut,
  amountsIn: BigNumberish[],
): Promise<BuiltShortcut> {
  let builtShortcut: BuiltShortcut;
  try {
    builtShortcut = await shortcut.build(chainId, provider);
  } catch (error) {
    throw new Error(`Unexpected error building shortcut: ${shortcut.name}. Reason: ${error}`);
  }

  const { script, metadata } = builtShortcut;

  // Validate metadata
  const { tokensIn, tokensOut } = metadata;
  if (!tokensIn) {
    throw new Error(
      `Invalid 'metadata.tokensIn' in shortcut: ${shortcut.name}. "tokensIn" array must have one item at least`,
    );
  }
  if (!tokensOut) {
    throw new Error(
      `Invalid 'metadata.tokensIn' in shortcut: ${shortcut.name}. "tokensOut" array must have one item at least`,
    );
  }
  if (amountsIn.length != tokensIn.length) {
    throw new Error(
      `Invalid 'metadata.amountsIn' and 'metadata.tokensIn' in shortcut: ${shortcut.name}. Length mismatch`,
    );
  }

  return { script, metadata };
}
