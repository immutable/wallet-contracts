// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./IERC7579Module.sol";

/**
 * @title IERC7579Validator
 * @notice Interface for ERC-7579 validator modules
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
interface IERC7579Validator is IERC7579Module {
    /*//////////////////////////////////////////////////////////////////////////
                                 VALIDATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Validates a UserOperation according to ERC-4337
     * @param userOp The ERC-4337 PackedUserOperation to validate
     * @param userOpHash The hash of the ERC-4337 PackedUserOperation
     * @return validationData Validation result according to ERC-4337
     * 
     * @dev MUST validate that the signature is a valid signature of the userOpHash
     * @dev SHOULD return ERC-4337's SIG_VALIDATION_FAILED (and not revert) on signature mismatch
     * @dev This function is called by the account during ERC-4337 validation phase
     */
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash) 
        external 
        returns (uint256 validationData);
}

// Import PackedUserOperation from ERC-4337
// Note: This should be imported from the actual ERC-4337 interfaces when available
struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}
