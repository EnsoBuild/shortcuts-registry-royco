// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IERC20 } from "@openzeppelin-contracts-5.1.0/interfaces/IERC20.sol";
import { StdStorage, Test, console2, stdStorage } from "forge-std-1.9.4/Test.sol";

contract SimulateShortcuts_Fork_Test is Test {
    using stdStorage for StdStorage;

    // Structs
    struct TrackedAddressBalance {
        // Tokens In
        uint256[] tokensInPre;
        uint256[] tokensInPost;
        int256[] tokensInDiff;
        // Tokens Out
        uint256[] tokensOutPre;
        uint256[] tokensOutPost;
        int256[] tokensOutDiff;
        // Tokens Dust
        uint256[] tokensDustPre;
        uint256[] tokensDustPost;
        int256[] tokensDustDiff;
    }

    // --- Network environment variables ---
    int256 private constant SIMULATION_BLOCK_NUMBER_LATEST = -1;
    int256 private constant SIMULATION_BLOCK_TIMESTAMP_LATEST = -1;
    string private constant SIMULATION_CHAIN_ID = "SIMULATION_CHAIN_ID";
    string private constant SIMULATION_RPC_URL = "SIMULATION_RPC_URL";
    string private constant SIMULATION_BLOCK_NUMBER = "SIMULATION_BLOCK_NUMBER";

    // --- Simulation environment variables --
    string private constant SIMULATION_JSON_ENV_VAR = "SIMULATION_JSON_DATA";
    uint256 private constant NUMBER_OF_JSON_STRINGIFIED_ARRAYS_PER_TX_TO_SIM = 12; // NB: keep it up to date with the
    // number of JSON arrays
    string private constant JSON_CHAIN_ID = ".chainId";
    string private constant JSON_RPC_URL = ".rpcUrl";
    string private constant JSON_SHORTCUT_NAMES = ".shortcutNames";
    string private constant JSON_BLOCK_NUMBERS = ".blockNumbers";
    string private constant JSON_BLOCK_TIMESTAMPS = ".blockTimestamps";
    string private constant JSON_CALLER = ".caller";
    string private constant JSON_CALLEE = ".callee";
    string private constant JSON_RECIPE_MARKET_HUB = ".recipeMarketHub";
    string private constant JSON_WEIROLL_WALLET = ".weirollWallet";
    string private constant JSON_TX_DATA = ".txData";
    string private constant JSON_TX_VALUES = ".txValues";
    string private constant JSON_TOKENS_IN = ".tokensIn";
    string private constant JSON_AMOUNTS_IN = ".amountsIn";
    string private constant JSON_TOKENS_IN_HOLDERS = ".tokensInHolders";
    string private constant JSON_REQUIRES_FUNDING = ".requiresFunding";
    string private constant JSON_TOKENS_OUT = ".tokensOut";
    string private constant JSON_TOKENS_DUST = ".tokensDust";
    string private constant JSON_TRACKED_ADDRESSES = ".trackedAddresses";
    string private constant JSON_LABEL_KEYS = ".labelKeys";
    string private constant JSON_LABEL_VALUES = ".labelValues";

    // --- Shortcut ---
    address private constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    string[] private s_shortcutNames;
    int256 private s_blockNumber;
    int256[] private s_blockNumbers;
    int256[] private s_blockTimestamps;
    address private s_caller;
    address private s_recipeMarketHub;
    address private s_weirollWallet;
    address private s_callee;
    uint256[] private s_txValues;
    bytes[] private s_txData;
    address[][] private s_tokensIn;
    uint256[][] private s_amountsIn;
    address[][] private s_tokensInHolders;
    bool[] private s_requiresFunding;
    address[][] private s_tokensOut;
    address[][] private s_tokensDust;
    address[][] private s_trackedAddresses;

    mapping(address address_ => string label) private s_addressToLabel;

    // --- Events ---
    event SimulationReportBase(uint256 shortcutIndex, address trackedAddress, address[] tokens, int256[] amountsDiff);
    event SimulationReportQuote(uint256 shortcutIndex, address trackedAddress, address[] tokens, int256[] amountsDiff);
    event SimulationReportDust(uint256 shortcutIndex, address trackedAddress, address[] tokens, int256[] amountsDiff);
    event SimulationReportGasUsed(uint256 shortcutIndex, uint256 gasUsed);

    // --- Custom Errors ---
    error SimulateShortcuts_Fork_Test__ArrayLengthsAreNotEq(
        uint256 shortcutIndex, string array1Name, uint256 array1Length, string array2Name, uint256 array2Length
    );
    error SimulateShortcuts_Fork_Test__BalancePostIsNotAmountIn(
        uint256 shortcutIndex, address tokenIn, uint256 amountIn, uint256 balancePre, uint256 balancePost
    );
    error SimulateShortcuts_Fork_Test__ShortcutFailed(uint256 shortcutIndex, bytes data);
    error SimulateShortcuts_Fork_Test__TokenInHolderNotFound(uint256 shortcutIndex, address tokenIn);
    error SimulateShortcuts_Fork_Test__TxToSimulateArrayLengthsAreNotEq();

    function setUp() public {
        // --- Read simulation json data from environment ---
        string memory jsonStr = vm.envString(SIMULATION_JSON_ENV_VAR);

        // --- Fork network ---
        string memory rpcUrl = vm.parseJsonString(jsonStr, JSON_RPC_URL);

        // Set `block.number`
        s_blockNumbers = vm.parseJsonIntArray(jsonStr, JSON_BLOCK_NUMBERS);

        if (s_blockNumbers[0] == SIMULATION_BLOCK_NUMBER_LATEST) {
            vm.createSelectFork(rpcUrl);
        } else {
            vm.createSelectFork(rpcUrl, uint256(s_blockNumbers[0]));
        }
        // Set `block.timestamp`
        s_blockTimestamps = vm.parseJsonIntArray(jsonStr, JSON_BLOCK_TIMESTAMPS);
        if (s_blockTimestamps[0] != SIMULATION_BLOCK_NUMBER_LATEST) {
            vm.warp(uint256(s_blockTimestamps[0]));
        }

        // --- Simulation roles ---
        s_caller = vm.parseJsonAddress(jsonStr, JSON_CALLER);
        s_recipeMarketHub = vm.parseJsonAddress(jsonStr, JSON_RECIPE_MARKET_HUB);
        s_weirollWallet = vm.parseJsonAddress(jsonStr, JSON_WEIROLL_WALLET);
        s_callee = vm.parseJsonAddress(jsonStr, JSON_CALLEE);

        // --- Shortcuts data ---
        s_shortcutNames = vm.parseJsonStringArray(jsonStr, JSON_SHORTCUT_NAMES);
        s_txData = vm.parseJsonBytesArray(jsonStr, JSON_TX_DATA);
        s_txValues = vm.parseJsonUintArray(jsonStr, JSON_TX_VALUES);

        // tokensIn
        string[] memory tokensInJson = vm.parseJsonStringArray(jsonStr, JSON_TOKENS_IN);
        for (uint256 i = 0; i < tokensInJson.length; i++) {
            s_tokensIn.push(abi.decode(vm.parseJson(tokensInJson[i]), (address[])));
        }

        // amountsIn
        string[] memory amountsInJson = vm.parseJsonStringArray(jsonStr, JSON_AMOUNTS_IN);
        for (uint256 i = 0; i < amountsInJson.length; i++) {
            s_amountsIn.push(vm.parseJsonUintArray(amountsInJson[i], ""));
        }

        // Cross-check `tokensIn` items length with `amountsIn` items length
        for (uint256 i = 0; i < s_tokensIn.length; i++) {
            if (s_tokensIn[i].length != s_amountsIn[i].length) {
                revert SimulateShortcuts_Fork_Test__ArrayLengthsAreNotEq(
                    i, // as shortcutIndex
                    "tokensIn",
                    s_tokensIn[i].length,
                    "amountsIn",
                    s_amountsIn[i].length
                );
            }
        }

        // tokensInHolders
        string[] memory tokensInHoldersJson = vm.parseJsonStringArray(jsonStr, JSON_TOKENS_IN_HOLDERS);
        for (uint256 i = 0; i < tokensInHoldersJson.length; i++) {
            s_tokensInHolders.push(abi.decode(vm.parseJson(tokensInHoldersJson[i]), (address[])));
        }

        // requiresFunding
        s_requiresFunding = vm.parseJsonBoolArray(jsonStr, JSON_REQUIRES_FUNDING);

        // tokensOut
        string[] memory tokensOutJson = vm.parseJsonStringArray(jsonStr, JSON_TOKENS_OUT);
        for (uint256 i = 0; i < tokensOutJson.length; i++) {
            s_tokensOut.push(abi.decode(vm.parseJson(tokensOutJson[i]), (address[])));
        }

        // tokensDust
        string[] memory tokensDustJson = vm.parseJsonStringArray(jsonStr, JSON_TOKENS_DUST);
        for (uint256 i = 0; i < tokensDustJson.length; i++) {
            s_tokensDust.push(abi.decode(vm.parseJson(tokensDustJson[i]), (address[])));
        }

        // trackedAddresses
        string[] memory trackedAddressesJson = vm.parseJsonStringArray(jsonStr, JSON_TRACKED_ADDRESSES);
        for (uint256 i = 0; i < trackedAddressesJson.length; i++) {
            s_trackedAddresses.push(abi.decode(vm.parseJson(trackedAddressesJson[i]), (address[])));
        }

        // Cross-check all JSON parsed arrays lengths
        uint256 totalLengths = s_shortcutNames.length + s_blockNumbers.length + s_blockTimestamps.length
            + s_txData.length + s_txValues.length + s_tokensIn.length + s_amountsIn.length + s_tokensInHolders.length
            + s_requiresFunding.length + s_tokensOut.length + s_tokensDust.length + s_trackedAddresses.length;
        if (totalLengths % NUMBER_OF_JSON_STRINGIFIED_ARRAYS_PER_TX_TO_SIM != 0) {
            revert SimulateShortcuts_Fork_Test__TxToSimulateArrayLengthsAreNotEq();
        }

        // --- Shortcuts Labels ---
        address[] memory labelKeys = vm.parseJsonAddressArray(jsonStr, JSON_LABEL_KEYS);
        string[] memory labelValues = vm.parseJsonStringArray(jsonStr, JSON_LABEL_VALUES);
        if (labelKeys.length != labelValues.length) {
            revert SimulateShortcuts_Fork_Test__ArrayLengthsAreNotEq(
                0, // as shortcutIndex
                "labelKeys",
                labelKeys.length,
                "labelValues",
                labelValues.length
            );
        }
        for (uint256 i = 0; i < labelKeys.length; i++) {
            s_addressToLabel[labelKeys[i]] = labelValues[i];
            vm.label(labelKeys[i], labelValues[i]);
        }

        // --- Fund caller ---
        vm.deal(s_caller, 1000 ether);
    }

    function getBalanceOf(address _token, address _account) internal view returns (uint256) {
        if (_token == NATIVE_TOKEN) return _account.balance;
        return IERC20(_token).balanceOf(_account);
    }

    function test_simulateShortcuts_1() public {
        console2.log(unicode"╔══════════════════════════════════════════╗");
        console2.log(unicode"║             SIMULATION REPORT            ║");
        console2.log(unicode"╚══════════════════════════════════════════╝");
        console2.log("| - NETWORK -------------");
        console2.log("| Chain ID    : ", block.chainid);
        if (s_blockNumbers[0] == SIMULATION_BLOCK_NUMBER_LATEST) {
            console2.log("| Block Number (Latest): ", block.number);
        } else {
            console2.log("| Block Number (Set): ", block.number);
        }
        if (s_blockTimestamps[0] == SIMULATION_BLOCK_TIMESTAMP_LATEST) {
            console2.log("| Block Timestamp (Latest): ", block.timestamp);
        } else {
            console2.log("| Block Timestamp (Set): ", block.timestamp);
        }
        console2.log("|");
        console2.log("| - ROLES -------------");
        // NOTE: logs below could be more granular if are being executed by execution mode (as enum)
        console2.log("| Test Contract : ");
        console2.log("|   Addr        : ", address(this));
        console2.log("|   Name        : Simulation_Fork_Test");
        console2.log("| Caller        : ");
        console2.log("|   Addr        : ", s_caller);
        console2.log("|   Name        : ", s_addressToLabel[s_caller]);
        console2.log("| Callee        : ");
        console2.log("|   Addr        : ", s_callee);
        console2.log("|   Name        : ", s_addressToLabel[s_callee]);
        console2.log("| RecipeMarketHub : ");
        console2.log("|   Addr        : ", s_recipeMarketHub);
        console2.log("| WeirollWallet : ");
        console2.log("|   Addr        : ", s_weirollWallet);
        console2.log("|");
        console2.log("| - SHORTCUTS -------------");
        console2.log("| Number of Shortcuts: ", s_txData.length);
        for (uint256 i = 0; i < s_shortcutNames.length; i++) {
            console2.log("| ", i, " ", s_shortcutNames[i]);
        }

        for (uint256 sIdx = 0; sIdx < s_txData.length; sIdx++) {
            // -- Set block number & timestamp ---
            if (sIdx != 0) {
                int256 blockNumber = s_blockNumbers[sIdx];
                if (blockNumber != SIMULATION_BLOCK_NUMBER_LATEST) {
                    vm.roll(uint256(blockNumber));
                }
                int256 blockTimestamp = s_blockTimestamps[sIdx];
                if (blockTimestamp != SIMULATION_BLOCK_TIMESTAMP_LATEST) {
                    vm.warp(uint256(blockTimestamp));
                }
            }

            TrackedAddressBalance[] memory taBalances = new TrackedAddressBalance[](s_trackedAddresses[sIdx].length);

            // --- Calculate balances before ---
            address[] memory tokensIn = s_tokensIn[sIdx];
            uint256[] memory amountsIn = s_amountsIn[sIdx];
            address[] memory tokensInHolders = s_tokensInHolders[sIdx];
            address[] memory tokensOut = s_tokensOut[sIdx];
            address[] memory tokensDust = s_tokensDust[sIdx];

            for (uint256 tabIdx = 0; tabIdx < taBalances.length; tabIdx++) {
                address trackedAddress = s_trackedAddresses[sIdx][tabIdx];
                TrackedAddressBalance memory taBalance;
                uint256[] memory tokensInBalancesPre = new uint256[](s_tokensIn[sIdx].length);
                uint256[] memory tokensOutBalancesPre = new uint256[](s_tokensOut[sIdx].length);
                uint256[] memory tokensDustBalancesPre = new uint256[](s_tokensDust[sIdx].length);

                // Tokens in (before funding them)
                for (uint256 i = 0; i < tokensIn.length; i++) {
                    tokensInBalancesPre[i] = getBalanceOf(tokensIn[i], trackedAddress);
                }
                taBalance.tokensInPre = tokensInBalancesPre;

                // Tokens out
                for (uint256 i = 0; i < tokensOut.length; i++) {
                    tokensOutBalancesPre[i] = getBalanceOf(tokensOut[i], trackedAddress);
                }
                taBalance.tokensOutPre = tokensOutBalancesPre;

                // Tokens dust
                for (uint256 i = 0; i < tokensDust.length; i++) {
                    tokensDustBalancesPre[i] = getBalanceOf(tokensDust[i], trackedAddress);
                }
                taBalance.tokensDustPre = tokensDustBalancesPre;

                taBalances[tabIdx] = taBalance;
            }

            // Fund wallet from Tokens In holders (except for native token)
            if (s_requiresFunding[sIdx]) {
                for (uint256 i = 0; i < tokensIn.length; i++) {
                    address tokenIn = tokensIn[i];
                    // NB: skip funding caller with native token, as it is not an ERC20 and it has been already funded
                    if (tokenIn == NATIVE_TOKEN) continue;

                    uint256 amountIn = amountsIn[i];
                    address holder = tokensInHolders[i];
                    if (holder == address(0)) {
                        revert SimulateShortcuts_Fork_Test__TokenInHolderNotFound(sIdx, tokenIn);
                    }
                    // uint256 balancePre = IERC20(tokenIn).balanceOf(s_weirollWallet);
                    vm.deal(holder, 1 ether);
                    vm.prank(holder);
                    IERC20(tokenIn).transfer(s_weirollWallet, amountIn);
                    // uint256 balancePost = IERC20(tokenIn).balanceOf(s_weirollWallet);

                    // NB: check disabled due to fee on transfer tokens
                    // if (balancePost - balancePre != amountIn) {
                    //     revert SimulateShortcuts_Fork_Test__BalancePostIsNotAmountIn(tokenIn, amountIn, balancePre,
                    // balancePost);
                    // }
                }
            }

            // -- Log Shortcut pre execution ---
            console2.log("|");
            console2.log(unicode"|──────────────────────────────────────────────|");
            console2.log(unicode"|────────────────── SHORTCUT", sIdx, unicode"────────────────|");
            console2.log(unicode"|──────────────────────────────────────────────|");
            console2.log("| Index    : ", sIdx);
            console2.log("| Name    : ", s_shortcutNames[sIdx]);
            console2.log("| Block Number: ", block.number);
            console2.log("| Block Timestamp: ", block.timestamp);
            console2.log("| Tx Value: ", s_txValues[sIdx]);
            console2.log("| Requires Funding: ", s_requiresFunding[sIdx]);

            // --- Execute shortcut ---
            // Load storage vars in memory to do not affect gas metrics when executing the shortcut
            uint256 txValue = s_txValues[sIdx];
            bytes memory txData = s_txData[sIdx];
            address callee = s_callee;

            vm.prank(s_caller);
            uint256 gasStart = gasleft();
            (bool success, bytes memory data) = callee.call{ value: txValue }(txData);
            uint256 gasEnd = gasleft();
            if (!success) {
                revert SimulateShortcuts_Fork_Test__ShortcutFailed(sIdx, data);
            }

            // -- Log Shortcut post execution ---
            for (uint256 tabIdx = 0; tabIdx < taBalances.length; tabIdx++) {
                address trackedAddress = s_trackedAddresses[sIdx][tabIdx];
                TrackedAddressBalance memory taBalance = taBalances[tabIdx];
                uint256[] memory tokensInBalancesPost = new uint256[](s_tokensIn[sIdx].length);
                int256[] memory tokensInBalancesDiff = new int256[](s_tokensIn[sIdx].length);
                uint256[] memory tokensOutBalancesPost = new uint256[](s_tokensOut[sIdx].length);
                int256[] memory tokensOutBalancesDiff = new int256[](s_tokensOut[sIdx].length);
                uint256[] memory tokensDustBalancesPost = new uint256[](s_tokensDust[sIdx].length);
                int256[] memory tokensDustBalancesDiff = new int256[](s_tokensDust[sIdx].length);

                // Tokens in (before funding them)
                for (uint256 i = 0; i < tokensIn.length; i++) {
                    tokensInBalancesPost[i] = getBalanceOf(tokensIn[i], trackedAddress);
                    tokensInBalancesDiff[i] =
                        int256(tokensInBalancesPost[i]) - int256(taBalances[tabIdx].tokensInPre[i]);
                }
                taBalance.tokensInPost = tokensInBalancesPost;
                taBalance.tokensInDiff = tokensInBalancesDiff;

                // Tokens out
                for (uint256 i = 0; i < tokensOut.length; i++) {
                    tokensOutBalancesPost[i] = getBalanceOf(tokensOut[i], trackedAddress);
                    tokensOutBalancesDiff[i] =
                        int256(tokensOutBalancesPost[i]) - int256(taBalances[tabIdx].tokensOutPre[i]);
                }
                taBalance.tokensOutPost = tokensOutBalancesPost;
                taBalance.tokensOutDiff = tokensOutBalancesDiff;

                // Tokens dust
                for (uint256 i = 0; i < tokensDust.length; i++) {
                    tokensDustBalancesPost[i] = getBalanceOf(tokensDust[i], trackedAddress);
                    tokensDustBalancesDiff[i] =
                        int256(tokensDustBalancesPost[i]) - int256(taBalances[tabIdx].tokensDustPre[i]);
                }
                taBalance.tokensDustPost = tokensDustBalancesPost;
                taBalance.tokensDustDiff = tokensDustBalancesDiff;

                taBalances[tabIdx] = taBalance;
            }

            // Tokens in
            console2.log("|");
            console2.log("| - TOKENS IN -------------");
            if (tokensIn.length == 0) {
                console2.log("| No Tokens In");
            }
            for (uint256 i = 0; i < tokensIn.length; i++) {
                console2.log("| Addr       : ", tokensIn[i]);
                console2.log("| Name       : ", s_addressToLabel[tokensIn[i]]);
                console2.log("| Is funded  : ", s_requiresFunding[sIdx]);
                console2.log("| Balances   : ");

                for (uint256 tabIdx = 0; tabIdx < taBalances.length; tabIdx++) {
                    address trackedAddress = s_trackedAddresses[sIdx][tabIdx];
                    string memory trackedAddressLabel = s_addressToLabel[trackedAddress];
                    console2.log("|   Addr     : ", trackedAddress);
                    console2.log("|   Name     : ", trackedAddressLabel);
                    console2.log("|     Pre    : ", taBalances[tabIdx].tokensInPre[i]);
                    if (trackedAddress == s_caller && s_requiresFunding[sIdx]) {
                        console2.log("|     Funded : ", amountsIn[i]);
                    }
                    console2.log("|     Post   : ", taBalances[tabIdx].tokensInPost[i]);
                    console2.log("|     Diff   : ", taBalances[tabIdx].tokensInDiff[i]);
                    console2.log("|");
                    // Emit simulation report data
                    emit SimulationReportBase(sIdx, trackedAddress, tokensIn, taBalances[tabIdx].tokensInDiff);
                }
                if (i != tokensIn.length - 1) {
                    console2.log(unicode"|--------------------------------------------");
                }
            }

            // Tokens out
            console2.log("|");
            console2.log("| - TOKENS OUT -------------");
            if (tokensOut.length == 0) {
                console2.log("| No Tokens Out");
            }
            for (uint256 i = 0; i < tokensOut.length; i++) {
                console2.log("| Addr       : ", tokensOut[i]);
                console2.log("| Name       : ", s_addressToLabel[tokensOut[i]]);
                console2.log("| Balances   : ");

                for (uint256 tabIdx = 0; tabIdx < taBalances.length; tabIdx++) {
                    address trackedAddress = s_trackedAddresses[sIdx][tabIdx];
                    string memory trackedAddressLabel = s_addressToLabel[trackedAddress];
                    console2.log("|   Addr     : ", trackedAddress);
                    console2.log("|   Name     : ", trackedAddressLabel);
                    console2.log("|     Pre    : ", taBalances[tabIdx].tokensOutPre[i]);
                    console2.log("|     Post   : ", taBalances[tabIdx].tokensOutPost[i]);
                    console2.log("|     Diff   : ", taBalances[tabIdx].tokensOutDiff[i]);
                    console2.log("|");
                    // Emit simulation report data
                    emit SimulationReportQuote(sIdx, trackedAddress, tokensOut, taBalances[tabIdx].tokensOutDiff);
                }
                if (i != tokensOut.length - 1) {
                    console2.log(unicode"|--------------------------------------------");
                }
            }

            // Tokens dust
            console2.log("|");
            console2.log("|- DUST TOKENS -------------");
            if (tokensDust.length == 0) {
                console2.log("| No Dust Tokens");
            }
            for (uint256 i = 0; i < tokensDust.length; i++) {
                console2.log("| Addr      : ", tokensDust[i]);
                console2.log("| Name      : ", s_addressToLabel[tokensDust[i]]);
                console2.log("| Balances  : ");

                for (uint256 tabIdx = 0; tabIdx < taBalances.length; tabIdx++) {
                    address trackedAddress = s_trackedAddresses[sIdx][tabIdx];
                    string memory trackedAddressLabel = s_addressToLabel[trackedAddress];
                    console2.log("|   Addr    : ", trackedAddress);
                    console2.log("|   Name    : ", trackedAddressLabel);
                    console2.log("|     Pre   : ", taBalances[tabIdx].tokensDustPre[i]);
                    console2.log("|     Post  : ", taBalances[tabIdx].tokensDustPost[i]);
                    console2.log("|     Diff  : ", taBalances[tabIdx].tokensDustDiff[i]);
                    console2.log("|");
                    // Emit simulation report data
                    emit SimulationReportDust(sIdx, trackedAddress, tokensDust, taBalances[tabIdx].tokensDustDiff);
                }
                if (i != tokensDust.length - 1) {
                    console2.log(unicode"|--------------------------------------------");
                }
            }

            // Gas metrics
            console2.log("|");
            console2.log("|- GAS --------------------");
            console2.log("| Used    : ", gasStart - gasEnd);

            // Emit simulation report data
            emit SimulationReportGasUsed(sIdx, gasStart - gasEnd);
        }

        console2.log(unicode"╚══════════════════════════════════════════╝");
    }
}
