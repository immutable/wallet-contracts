// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.27;

import "./interfaces/IMultiCallDeploy.sol";
import {SignatureCheckerLib} from "solady/utils/SignatureCheckerLib.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

contract SignedMultiCallDeploy {
    using ECDSA for bytes32;
    using SignatureCheckerLib for address;

    error InvalidSignature();
    event MultiCallDeployInvocationSuccess();

    address internal $signer;
    IMultiCallDeploy internal immutable MULTI_CALL_DEPLOY;

    constructor(address signer, address multiCallDeployer) {
        $signer = signer;
        MULTI_CALL_DEPLOY = IMultiCallDeploy(multiCallDeployer);
    }

    /// @notice Updates the signer address. Only callable by the current signer.
    /// @param newSigner The address of the new signer.
    function updateSigner(address newSigner) external {
        require(msg.sender == $signer, "Only current signer can update signer");
        require(newSigner != address(0), "New signer cannot be zero address");
        $signer = newSigner;
    }

    function deployAndExecuteWithSignature(
        address cfa,
        address _mainModule,
        bytes32 _salt,
        address factory,
        IModuleCalls.Transaction[] calldata _txs,
        uint256 _nonce,
        bytes calldata _walletOwnersSignature,  // signed txns by wallet owners
        bytes calldata _executorSignature) external { // provenance signature by central executor (not the wallet owners)
        bytes memory callData = abi.encodeWithSelector(
            MULTI_CALL_DEPLOY.deployAndExecute.selector,
            cfa,
            _mainModule,
            _salt,
            factory,
            _txs,
            _nonce,
            _walletOwnersSignature
        );
        bytes32 hash = keccak256(callData).toEthSignedMessageHash();
        require($signer.isValidSignatureNowCalldata(hash, _executorSignature), InvalidSignature());

        IMultiCallDeploy(MULTI_CALL_DEPLOY).deployAndExecute(cfa,
            _mainModule,
            _salt,
            factory,
            _txs,
            _nonce,
            _walletOwnersSignature);
        
        emit MultiCallDeployInvocationSuccess();
    }
}


/**
 * 
 * Deploy ImmutableSigner
 * Deploy SignedMuiltiCallDeploy - set the signer to be the ImmutableSigner
 * Whitelist the SignedMultiCallDeploy on MultiCallDeploy
 * 
 * 
 */