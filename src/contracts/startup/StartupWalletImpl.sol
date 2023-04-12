// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import "./ILatestWalletImplLocator.sol";

/**
 * @title StartupWalletImpl
 * @notice Initial wallet implementation contract used to setup the proxy with the latest
 *        implementation contract and ensure that the minimal proxy deployment data never
 *        needs to change.
 *        Note that this code executed in the context of the WalletProxy.yul. As such,
 *        the address of the Latest Wallet Implementation Locator contract needs to be
 *        inserted directly into the code of the contract.
 */
contract StartupWalletImpl {
    // This value will be removed from the bytecode and patched with the address of the locator contract.
    uint160 private constant LOCATION_OF_ADDRESS = 0x00123456789A123456789A123456789A123456789A;


    fallback() external payable {
        // Get the address of the latest version of the wallet implementation.
        ILatestWalletImplLocator locator = ILatestWalletImplLocator(address(LOCATION_OF_ADDRESS));
        address latestImplAddr = locator.latestWalletImplementation();

        // solhint-disable-next-line no-inline-assembly
        assembly{
            // Store the address of the implementation to use in the storage slot defined by the
            // address of this contract.
            sstore(address(), latestImplAddr)

            // Now do a standard delegate call to the wallet implementation and return the
            // results / errors.
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), latestImplAddr, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {revert(0, returndatasize())}
            default {return (0, returndatasize())}
        }
    }
}
