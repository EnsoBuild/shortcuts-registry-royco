// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMultiCall {
    struct Call {
        address target;
        bytes callData;
    }

    function aggregate(Call[] memory calls) external returns (uint256 blockNumber, bytes[] memory returnData);
}
