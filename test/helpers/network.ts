import { ChainIds } from '@ensofinance/shortcuts-builder/types';
import { BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { getRpcUrlByChainId } from '../../src/helpers';

export async function getBlockTimestamp(provider: StaticJsonRpcProvider, blockNumber: BigNumberish): Promise<number> {
  const block = await provider.getBlock(Number(blockNumber));
  if (!block) throw new Error(`Block ${blockNumber} not found`);
  return block.timestamp;
}

export function getProviderByChainId(chainId: ChainIds): StaticJsonRpcProvider {
  const rpcUrl = getRpcUrlByChainId(chainId);
  return new StaticJsonRpcProvider({
    url: rpcUrl,
  });
}
