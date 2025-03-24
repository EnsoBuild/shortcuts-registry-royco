import { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

async function call(
  provider: StaticJsonRpcProvider,
  iface: Interface,
  target: string,
  method: string,
  args: ReadonlyArray<BigNumberish>,
) {
  const data = await provider.call({
    to: target,
    data: iface.encodeFunctionData(method, args),
  });
  return iface.decodeFunctionResult(method, data);
}

export function getEncodedData(commands: string[], state: string[]): string {
  const weirollWalletInterface = new Interface([
    'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
  ]);
  return weirollWalletInterface.encodeFunctionData('executeWeiroll', [commands, state]);
}

export function getEncodedDataErc20Transfer(recipient: AddressArg, value: string): string {
  const erc20Interface = new Interface(['function transfer(address to, uint256 value)']);
  return erc20Interface.encodeFunctionData('transfer', [recipient, value]);
}

export function getEncodedDataErc20BalanceOf(account: AddressArg): string {
  const erc20Interface = new Interface(['function balanceOf(address account) view returns (uint256)']);
  return erc20Interface.encodeFunctionData('balanceOf', [account]);
}

export function getEncodeDataNativeBalance(): string {
  const weirollWalletHelperInterface = new Interface(['function nativeBalance() view returns (uint256)']);
  return weirollWalletHelperInterface.encodeFunctionData('nativeBalance');
}

export async function getBalances(
  provider: StaticJsonRpcProvider,
  wallet: string,
  tokens: string[],
): Promise<BigNumber[]> {
  const tokenInterface = new Interface(['function balanceOf(address owner) external view returns (uint256 amount)']);
  return Promise.all(
    tokens.map(
      async (token) =>
        (await call(provider, tokenInterface, token, 'balanceOf', [wallet])).amount as unknown as BigNumber,
    ),
  );
}

export async function getDepositLockerAmount(provider: StaticJsonRpcProvider, marketHash: string): Promise<BigNumber> {
  const depositLockerInterface = new Interface([
    'function marketHashToMerkleDepositsInfo(bytes32 marketHash) external view returns ((uint256 _nextLeafIndex, bytes32[] _sides, bytes32[] _zeros) merkleTree, bytes32 merkleRoot, uint256 totalAmountDeposited, uint256 lastCcdmNonceBridged)',
  ]);
  const depositInfo = await call(
    provider,
    depositLockerInterface,
    '0x63E8209CAa13bbA1838E3946a50d717071A28CFB',
    'marketHashToMerkleDepositsInfo',
    [marketHash],
  );
  return depositInfo.totalAmountDeposited as BigNumber;
}

export async function getMarketInputToken(provider: StaticJsonRpcProvider, marketHash: string): Promise<AddressArg> {
  const recipeHubInterface = new Interface([
    'function marketHashToWeirollMarket(bytes32 marketHash) external view returns (uint256 marketID, address inputToken, uint256 lockupTime, uint256 frontendFee, (bytes32[] commands, bytes[] state) depositRecipe, (bytes32[] commands, bytes[] state) withdrawRecipe, uint256 rewardStyle)',
  ]);
  const marketInfo = await call(
    provider,
    recipeHubInterface,
    '0x783251f103555068c1E9D755f69458f39eD937c0',
    'marketHashToWeirollMarket',
    [marketHash],
  );
  return marketInfo.inputToken as AddressArg;
}
