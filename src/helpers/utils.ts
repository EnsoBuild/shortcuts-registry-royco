import { AddressArg, ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types';
import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import crypto from 'crypto';

import { chainIdToSimulationRoles } from '../constants';
import { SimulationRoles } from '../types';

export function getChainId(chainName: string) {
  chainName = chainName.toLowerCase(); // ensure consistent
  const key = (chainName.charAt(0).toUpperCase() + chainName.slice(1)) as keyof typeof ChainIds;
  return ChainIds[key];
}

export function getSimulationRolesByChainId(chainId: number): SimulationRoles {
  const roles = chainIdToSimulationRoles.get(chainId);
  if (!roles)
    throw new Error(
      `Missing simulation roles for 'chainId': ${chainId}. Please, update 'chainIdToSimulationRoles' map`,
    );

  if (!roles.caller?.address) throw new Error("missing 'caller' address in 'roles'");
  if (!roles.multiCall?.address) throw new Error("missing 'multiCall' address in 'roles'");
  if (!roles.roycoWalletHelpers?.address) throw new Error("missing 'roycoWalletHelpers' address in 'roles'");
  if (!roles.nativeToken?.address) throw new Error("missing 'nativeToken' address in 'roles'");

  return roles;
}

export function buildVerificationHash(receiptToken: AddressArg, script: WeirollScript) {
  return keccak256(
    defaultAbiCoder.encode(['address', 'tuple(bytes32[], bytes[])'], [receiptToken, [script.commands, script.state]]),
  );
}

export function hashContent(content: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function getNativeToken(chainId: ChainIds): AddressArg {
  const roles = getSimulationRolesByChainId(chainId);
  return roles.nativeToken.address as AddressArg;
}
