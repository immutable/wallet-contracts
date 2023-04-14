// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../modules/MainModuleDynamicAuth.sol";

contract MainModuleMockV2 is MainModuleDynamicAuth {
    constructor(address _factory, address _startup) MainModuleDynamicAuth(_factory, _startup) {}

    function version() external pure override returns (uint256) {
        return 2;
    }

}