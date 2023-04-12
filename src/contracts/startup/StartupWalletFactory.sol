// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;


/**
 * Contract to deploy the Startup Wallet Implementation contract.
 */
contract StartupWalletFactory {

    bytes constant private startupWalletImplByteCodePart1 =
        // Init code                                                      Start of runtime code
        hex"608060405234801561001057600080fd5b5060ec8061001f6000396000f3fe608060408190527f0143445100000000000000000000000000000000000000000000000000000000815273";
    bytes constant private startupWalletImplByteCodePart2 =
        // Runtime code after the address of the locator contract.
        hex"90600090829063014344519060849060209060048187875af11580156067573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906089919060b1565b90508030553660008037600080366000845af43d6000803e80801560ac573d6000f35b3d6000fd5b60006020828403121560c257600080fd5b815173ffffffffffffffffffffffffffffffffffffffff8116811460e557600080fd5b939250505056";

    // Emit the address that the startup wallet implementation was deployed to.
    event StartupWalletImplDeployed(address _addr);

    /**
     * Deploy the Startup Wallet Implementation contract, inserting the address
     * of the latest wallet implementation locator into the bytecode.
     *
     * @param _latestWalletImplLocator Address of the contract that holds the address
     *         of the latest version of the wallet implementation contract.
     */
    function deploy(address _latestWalletImplLocator) external {
        bytes memory code = abi.encodePacked(startupWalletImplByteCodePart1,
            _latestWalletImplLocator, startupWalletImplByteCodePart2);
        address contractAddress;
        assembly {
            contractAddress := create(callvalue(), add(code, 32), mload(code))
        }
        // check deployment success
        require(contractAddress != address(0), 'Deployment failed');
        emit StartupWalletImplDeployed(contractAddress);
    }
}