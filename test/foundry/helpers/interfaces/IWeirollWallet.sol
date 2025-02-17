// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IWeirollWallet {
    function executeWeiroll(
        bytes32[] calldata commands,
        bytes[] calldata state
    )
        external
        payable
        returns (bytes[] memory);
}
