// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "../modules/MainModuleDynamicAuth.sol";

contract MainModuleMockV2 is MainModuleDynamicAuth {
    // solhint-disable-next-line no-empty-blocks
    constructor(address _factory, address _startupWalletImpl, address _immutableSignerContract) MainModuleDynamicAuth(_factory, _startupWalletImpl, _immutableSignerContract) {}

    function version() external pure override returns (uint256) {
        return 2;
    }

}