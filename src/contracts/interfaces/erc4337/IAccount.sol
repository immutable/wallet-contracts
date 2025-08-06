// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

interface IAccount {
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    /// @param userOp The userOp to validate.
    /// @param userOpHash The hash of the userOp.
    /// @param missingAccountFunds The amount of funds missing from the account to pay for the userOp.
    /// @return validationData For valid signatures, returns a packed value of authorizer, validUntil, and validAfter.
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
} 