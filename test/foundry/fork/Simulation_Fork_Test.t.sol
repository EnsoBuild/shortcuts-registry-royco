// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IERC20 } from '@openzeppelin-contracts-5.1.0/interfaces/IERC20.sol';
import { StdStorage, Test, console2, stdStorage } from 'forge-std-1.9.4/Test.sol';

contract Simulation_Fork_Test is Test {
  using stdStorage for StdStorage;

  // --- Network environment variables ---
  int256 private constant SIMULATION_BLOCK_NUMBER_LATEST = -1;
  string private constant SIMULATION_CHAIN_ID = 'SIMULATION_CHAIN_ID';
  string private constant SIMULATION_RPC_URL = 'SIMULATION_RPC_URL';
  string private constant SIMULATION_BLOCK_NUMBER = 'SIMULATION_BLOCK_NUMBER';

  // --- Simulation environment variables --
  string private constant SIMULATION_JSON_ENV_VAR = 'SIMULATION_JSON_DATA';
  string private constant JSON_CHAIN_ID = '.chainId';
  string private constant JSON_RPC_URL = '.rpcUrl';
  string private constant JSON_BLOCK_NUMBER = '.blockNumber';
  string private constant JSON_CALLER = '.caller';
  string private constant JSON_CALLEE = '.callee';
  string private constant JSON_RECIPE_MARKET_HUB = '.recipeMarketHub';
  string private constant JSON_WEIROLL_WALLET = '.weirollWallet';
  string private constant JSON_TX_DATA = '.txData';
  string private constant JSON_TX_VALUE = '.txValue';
  string private constant JSON_TOKENS_IN = '.tokensIn';
  string private constant JSON_AMOUNTS_IN = '.amountsIn';
  string private constant JSON_TOKENS_IN_HOLDERS = '.tokensInHolders';
  string private constant JSON_TOKENS_OUT = '.tokensOut';
  string private constant JSON_TOKENS_DUST = '.tokensDust';
  string private constant JSON_LABEL_KEYS = '.labelKeys';
  string private constant JSON_LABEL_VALUES = '.labelValues';

  // --- Shortcut ---
  address private constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
  int256 private s_blockNumber;
  address private s_caller;
  address private s_recipeMarketHub;
  address private s_weirollWallet;
  address private s_callee;
  uint256 private s_txValue;
  bytes private s_txData;
  address[] private s_tokensIn;
  uint256[] private s_amountsIn;
  address[] private s_tokensOut;
  address[] private s_tokensDust;
  address[] private s_tokensInHolders;

  mapping(address address_ => string label) private s_addressToLabel;

  // --- Events ---
  event SimulationReportQuote(address[] tokensOut, uint256[] amountsOut);
  event SimulationReportDust(address[] tokensDust, uint256[] amountsDust);
  event SimulationReportGasUsed(uint256 gasUsed);

  // --- Custom Errors ---
  error Simulation_Fork_Test__ArrayLengthsAreNotEq(
    string array1Name,
    uint256 array1Length,
    string array2Name,
    uint256 array2Length
  );
  error Simulation_Fork_Test__BalancePostIsNotAmountIn(
    address tokenIn,
    uint256 amountIn,
    uint256 balancePre,
    uint256 balancePost
  );
  error Simulation_Fork_Test__SimulationCallFailed(bytes data);
  error Simulation_Fork_Test__TokenInHolderNotFound(address tokenIn);

  function setUp() public {
    // --- Read simulation json data from environment ---
    string memory jsonStr = vm.envString(SIMULATION_JSON_ENV_VAR);

    // --- Fork network ---
    string memory rpcUrl = vm.parseJsonString(jsonStr, JSON_RPC_URL);
    int256 blockNumber = vm.parseJsonInt(jsonStr, JSON_BLOCK_NUMBER);
    s_blockNumber = blockNumber;

    if (blockNumber == SIMULATION_BLOCK_NUMBER_LATEST) {
      vm.createSelectFork(rpcUrl);
    } else {
      vm.createSelectFork(rpcUrl, uint256(blockNumber));
    }

    s_caller = vm.parseJsonAddress(jsonStr, JSON_CALLER);
    s_recipeMarketHub = vm.parseJsonAddress(jsonStr, JSON_RECIPE_MARKET_HUB);
    s_weirollWallet = vm.parseJsonAddress(jsonStr, JSON_WEIROLL_WALLET);
    s_callee = vm.parseJsonAddress(jsonStr, JSON_CALLEE);
    s_txData = vm.parseJsonBytes(jsonStr, JSON_TX_DATA);
    s_txValue = vm.parseJsonUint(jsonStr, JSON_TX_VALUE);
    s_tokensIn = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_IN);
    s_amountsIn = vm.parseJsonUintArray(jsonStr, JSON_AMOUNTS_IN);

    if (s_tokensIn.length != s_amountsIn.length) {
      revert Simulation_Fork_Test__ArrayLengthsAreNotEq('tokensIn', s_tokensIn.length, 'amountsIn', s_amountsIn.length);
    }

    s_tokensInHolders = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_IN_HOLDERS);
    s_tokensOut = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_OUT);
    s_tokensDust = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_DUST);

    address[] memory labelKeys = vm.parseJsonAddressArray(jsonStr, JSON_LABEL_KEYS);
    string[] memory labelValues = vm.parseJsonStringArray(jsonStr, JSON_LABEL_VALUES);

    // --- Set labels ---
    // Simulation labels
    if (labelKeys.length != labelValues.length) {
      revert Simulation_Fork_Test__ArrayLengthsAreNotEq(
        'labelKeys',
        labelKeys.length,
        'labelValues',
        labelValues.length
      );
    }
    for (uint256 i = 0; i < labelKeys.length; i++) {
      s_addressToLabel[labelKeys[i]] = labelValues[i];
      vm.label(labelKeys[i], labelValues[i]);
    }

    // --- Fund addresses ---
    vm.deal(s_caller, 1000 ether);
  }

  function getBalanceOf(address _token, address _account) internal view returns (uint256) {
    if (_token == NATIVE_TOKEN) return _account.balance;
    return IERC20(_token).balanceOf(_account);
  }

  function test_simulateShortcut_1() public {
    uint256[] memory tokensInBalancesPre = new uint256[](s_tokensIn.length);
    uint256[] memory tokensOutBalancesPre = new uint256[](s_tokensOut.length);
    uint256[] memory tokensDustBalancesPre = new uint256[](s_tokensDust.length);

    // --- Calculate balances before ---
    // Tokens in (before funding them)
    for (uint256 i = 0; i < s_tokensIn.length; i++) {
      tokensInBalancesPre[i] = getBalanceOf(s_tokensIn[i], s_weirollWallet);
    }
    // Tokens out
    for (uint256 i = 0; i < s_tokensOut.length; i++) {
      tokensOutBalancesPre[i] = getBalanceOf(s_tokensOut[i], s_weirollWallet);
    }
    // Tokens dust
    for (uint256 i = 0; i < s_tokensDust.length; i++) {
      tokensDustBalancesPre[i] = getBalanceOf(s_tokensDust[i], s_weirollWallet);
    }
    // Fund wallet from Tokens In holders (except for native token)
    for (uint256 i = 0; i < s_tokensIn.length; i++) {
      address tokenIn = s_tokensIn[i];
      // NB: skip funding caller with native token, as it is not an ERC20 and it has been already funded
      if (tokenIn == NATIVE_TOKEN) continue;

      uint256 amountIn = s_amountsIn[i];
      address holder = s_tokensInHolders[i];
      if (holder == address(0)) {
        revert Simulation_Fork_Test__TokenInHolderNotFound(tokenIn);
      }
      uint256 balancePre = IERC20(tokenIn).balanceOf(s_weirollWallet);
      if (IERC20(tokenIn).balanceOf(holder) < amountIn) {
        stdstore.target(tokenIn).sig('balanceOf(address)').with_key(holder).checked_write(amountIn);
      }
      vm.deal(holder, 1 ether);
      vm.prank(holder);
      IERC20(tokenIn).transfer(s_weirollWallet, amountIn);
      uint256 balancePost = IERC20(tokenIn).balanceOf(s_weirollWallet);

      // NB: check disabled due to fee on transfer tokens
      // if (balancePost - balancePre != amountIn) {
      //     revert Simulation_Fork_Test__BalancePostIsNotAmountIn(tokenIn, amountIn, balancePre, balancePost);
      // }
    }

    // --- Execute shortcut ---
    uint256 txValue = s_txValue;
    bytes memory txData = s_txData;

    vm.prank(s_caller);
    uint256 gasStart = gasleft();
    (bool success, bytes memory data) = s_callee.call{ value: txValue }(txData);
    uint256 gasEnd = gasleft();
    if (!success) {
      revert Simulation_Fork_Test__SimulationCallFailed(data);
    }

    // -- Log simulation results ---
    console2.log(unicode'╔══════════════════════════════════════════╗');
    console2.log(unicode'║              SIMULATION RESULTS          ║');
    console2.log(unicode'╚══════════════════════════════════════════╝');
    console2.log('| Chain ID    : ', block.chainid);
    if (s_blockNumber == SIMULATION_BLOCK_NUMBER_LATEST) {
      console2.log('| Block Number (Latest): ', block.number);
    } else {
      console2.log('| Block Number (Fork): ', block.number);
    }
    // NOTE: logs below could be more granular if are being executed by execution mode (as enum)
    console2.log('| Caller        : ');
    console2.log('|   Addr        : ', s_caller);
    console2.log('|   Name        : ', s_addressToLabel[s_caller]);
    console2.log('| Callee        : ');
    console2.log('|   Addr        : ', s_callee);
    console2.log('|   Name        : ', s_addressToLabel[s_callee]);
    console2.log('| WeirollWallet : ');
    console2.log('|   Addr        : ', s_weirollWallet);

    // Tokens in
    console2.log(unicode'|────────────────────────────────────────────');
    console2.log('| - TOKENS IN -------------');
    if (s_tokensOut.length == 0) {
      console2.log('| No Tokens In');
    }
    for (uint256 i = 0; i < s_tokensIn.length; i++) {
      uint256 tokenInBalancePost = getBalanceOf(s_tokensIn[i], s_weirollWallet);
      console2.log('| Addr    : ', s_tokensIn[i]);
      console2.log('| Name    : ', s_addressToLabel[s_tokensIn[i]]);
      console2.log('| Amount  : ');
      console2.log('|   Pre   : ', tokensInBalancesPre[i]);
      console2.log('|   In    : ', s_amountsIn[i]);
      console2.log('|   Post  : ', tokenInBalancePost);
      if (i != s_tokensIn.length - 1) {
        console2.log(unicode'|--------------------------------------------');
      }
    }

    // Tokens out
    console2.log(unicode'|────────────────────────────────────────────');
    console2.log('| - TOKENS OUT -------------');
    if (s_tokensOut.length == 0) {
      console2.log('| No Tokens Out');
    }
    uint256[] memory tokensOutAmounts = new uint256[](s_tokensOut.length);
    for (uint256 i = 0; i < s_tokensOut.length; i++) {
      uint256 tokenOutBalancePost = getBalanceOf(s_tokensOut[i], s_weirollWallet);
      console2.log('| Addr    : ', s_tokensOut[i]);
      console2.log('| Name    : ', s_addressToLabel[s_tokensOut[i]]);
      tokensOutAmounts[i] = tokenOutBalancePost - tokensOutBalancesPre[i];
      console2.log('| Amount  : ', tokenOutBalancePost - tokensOutBalancesPre[i]);
      console2.log('|   Pre   : ', tokensOutBalancesPre[i]);
      console2.log('|   Post  : ', tokenOutBalancePost);
      if (i != s_tokensOut.length - 1) {
        console2.log(unicode'|--------------------------------------------');
      }
    }

    // Tokens dust
    console2.log(unicode'|────────────────────────────────────────────');
    console2.log('|- DUST TOKENS -------------');
    if (s_tokensDust.length == 0) {
      console2.log('| No Dust Tokens');
    }
    uint256[] memory tokensDustAmounts = new uint256[](s_tokensDust.length);
    for (uint256 i = 0; i < s_tokensDust.length; i++) {
      uint256 tokenDustBalancePost = getBalanceOf(s_tokensDust[i], s_weirollWallet);
      console2.log('| Addr    : ', s_tokensDust[i]);
      console2.log('| Name    : ', s_addressToLabel[s_tokensDust[i]]);
      tokensDustAmounts[i] = tokenDustBalancePost - tokensDustBalancesPre[i];
      console2.log('| Amount  : ', tokenDustBalancePost - tokensDustBalancesPre[i]);
      console2.log('|   Pre   : ', tokensDustBalancesPre[i]);
      console2.log('|   Post  : ', tokenDustBalancePost);
      if (i != s_tokensDust.length - 1) {
        console2.log(unicode'|--------------------------------------------');
      }
    }
    console2.log(unicode'|────────────────────────────────────────────');
    console2.log('|- Gas --------------------');
    console2.log('| Used    : ', gasStart - gasEnd);
    console2.log(unicode'╚══════════════════════════════════════════╝');

    // Emit simulation report data
    emit SimulationReportQuote(s_tokensOut, tokensOutAmounts);
    emit SimulationReportDust(s_tokensDust, tokensDustAmounts);
    emit SimulationReportGasUsed(gasStart - gasEnd);
  }
}
