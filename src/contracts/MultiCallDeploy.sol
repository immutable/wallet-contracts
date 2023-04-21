// Copyright (c) Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./modules/commons/interfaces/IModuleCalls.sol";
import "./interfaces/IFactory.sol";
pragma experimental ABIEncoderV2;

/**
 * @title MultiCallDeploy
 * @notice This contract is bundles the wallet deployment and the users first write transaction into a single transaction.
 *         Contract usage is intended for the submitter inside the relayer service, which will call either of the functions.
 */
contract MultiCallDeploy {
    // TODO: add access control later. IModuleCall version mismatch. All modules use a different solc version that RBAC.

    // deployExecute will handle the wallet deployment and first write transaction
    function deployExecute(address _mainModule, bytes32 _salt, address factory,  IModuleCalls.Transaction[] calldata _txs, uint256 _nonce, bytes calldata _signature) external {
        address ret = IFactory(factory).deploy(_mainModule, _salt);
        IModuleCalls(ret).execute(_txs, _nonce, _signature);
    }

    // deployAndExecute will act as a single entry point for the submitter, handling wallet existence checking, wallet deployment and transaction execution
    function deployAndExecute(address cfa, address _mainModule, bytes32 _salt, address factory,  IModuleCalls.Transaction[] calldata _txs, uint256 _nonce, bytes calldata _signature) external {
        // Get code size at CFA
        uint32 size;
        assembly {
            size := extcodesize(cfa)
        }

        // If size is 0, deploy the proxy and execute write tx
        // Else, execute the users transaction
        if (size == 0) {
            address ret = IFactory(factory).deploy(_mainModule, _salt);
            require(cfa == ret, "MultiCallDeploy: deployed address does not match CFA");
            IModuleCalls(ret).execute(_txs, _nonce, _signature);
        } else {
            IModuleCalls(cfa).execute(_txs, _nonce, _signature);
        }
    }
}