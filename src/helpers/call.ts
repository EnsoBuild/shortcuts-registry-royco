import { AddressArg } from '@ensofinance/shortcuts-builder/types';
import { Interface } from '@ethersproject/abi';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

import { chainIdToDeFiAddresses } from '../constants';
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from '../simulations/simulateOnQuoter';

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

async function quote(
  chainId: number,
  iface: Interface,
  target: string,
  method: string,
  args: ReadonlyArray<BigNumberish>,
  tokenIn: AddressArg,
  tokenOut: AddressArg,
  amountIn: string,
) {
  const data = iface.encodeFunctionData(method, args);
  const tx: APITransaction = {
    data,
    value: '0',
    to: target,
    from: '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11',
  };

  const request: QuoteRequest = {
    chainId,
    transactions: [tx],
    tokenIn: [tokenIn],
    amountIn: [amountIn],
    tokenOut: [tokenOut],
  };

  const response = (await simulateTransactionOnQuoter(request))[0];
  if (response.status === 'Error') throw 'Quote error';
  return response.amountOut[0];
}

export function getEncodedData(commands: string[], state: string[]): string {
  const weirollWalletInterface = new Interface([
    'function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)',
  ]);
  return weirollWalletInterface.encodeFunctionData('executeWeiroll', [commands, state]);
}

export async function getUniswapLiquidity(
  provider: StaticJsonRpcProvider,
  lpToken: AddressArg,
  liquidity: BigNumberish,
) {
  const lpInterface = new Interface([
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function totalSupply() external view returns (uint256)',
  ]);
  const [token0Response, token1Response] = await Promise.all([
    call(provider, lpInterface, lpToken, 'token0', []),
    call(provider, lpInterface, lpToken, 'token1', []),
  ]);
  const [token0, token1] = [token0Response[0], token1Response[0]];
  const [balance0, balance1] = await getBalances(provider, lpToken, [token0, token1]);
  const totalSupply = (await call(provider, lpInterface, lpToken, 'totalSupply', []))[0];
  const amount0 = BigNumber.from(liquidity).mul(balance0).div(totalSupply).toString();
  const amount1 = BigNumber.from(liquidity).mul(balance1).div(totalSupply).toString();
  return { amount0, amount1, token0, token1 };
}

export async function getHoneyExchangeRate(
  provider: StaticJsonRpcProvider,
  chainId: number,
  underlyingToken: AddressArg,
): Promise<BigNumber> {
  const honeyFactoryInterface = new Interface(['function mintRates(address) external view returns (uint256)']);
  const honeyFactory = chainIdToDeFiAddresses[chainId]!.honeyFactory;
  return (await call(provider, honeyFactoryInterface, honeyFactory, 'mintRates', [underlyingToken]))[0] as BigNumber;
}

export async function getBeraEthExchangeRate(provider: StaticJsonRpcProvider, chainId: number): Promise<BigNumber> {
  const addresses = chainIdToDeFiAddresses[chainId];
  if (!addresses) {
    throw new Error(`No addresses configured for chainId=${chainId}`);
  }
  const { weth, rBeraeth, beraeth } = addresses;

  /*
  const quoterInterface = new Interface([
    'function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256)',
  ]);

  const beraethInterface = new Interface([
    'function getLSTAmount(uint256 rBeraETHAmount) external view returns (uint256)',
  ]);

  // Convert 1 WETH  → rBeraETH

  const [rBeraethAmount] = await call(
    provider,
    quoterInterface,
    bridgeQuoter,
    'getAmountOut',
    [weth, BigNumber.from(10).pow(18)], // 1 WETH in wei
  );

  // Convert rBeraETH → beraETH

  const [beraethAmount] = await call(provider, beraethInterface, beraeth, 'getLSTAmount', [rBeraEthAmount]);
*/

  const amountIn = BigNumber.from(10).pow(18).toString();
  const amountOut = await quote(
    chainId,
    new Interface([
      'function depositAndWrap(address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256)',
    ]),
    rBeraeth,
    'depositAndWrap',
    [weth, amountIn, 0],
    weth,
    beraeth,
    amountIn,
  );

  return BigNumber.from(amountOut);
}

export async function getIslandMintAmounts(
  provider: StaticJsonRpcProvider,
  island: AddressArg,
  amounts: string[],
): Promise<{ amount0: BigNumber; amount1: BigNumber; mintAmount: BigNumber }> {
  const islandInterface = new Interface([
    'function getMintAmounts(uint256, uint256) external view returns (uint256 amount0, uint256 amount1, uint256 mintAmount)',
  ]);
  const mintAmounts = await call(provider, islandInterface, island, 'getMintAmounts', amounts);
  return {
    amount0: mintAmounts.amount0,
    amount1: mintAmounts.amount1,
    mintAmount: mintAmounts.mintAmount,
  };
}

export async function getIslandTokens(
  provider: StaticJsonRpcProvider,
  island: AddressArg,
): Promise<{ token0: AddressArg; token1: AddressArg }> {
  const islandInterface = new Interface([
    'function token0() external view returns (address token)',
    'function token1() external view returns (address token)',
  ]);
  const [token0, token1] = (
    await Promise.all([
      call(provider, islandInterface, island, 'token0', []),
      call(provider, islandInterface, island, 'token1', []),
    ])
  ).map((response) => response.token);

  return {
    token0,
    token1,
  };
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
