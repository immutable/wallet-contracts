// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

/**
 * @title IERC7579Module
 * @dev Base interface for ERC-7579 modules
 */
interface IModule {
  /**
   * @dev Returns the type of the module
   * @return moduleType The type of the module (1 = Validator, 2 = Executor, 3 = Fallback, 4 = Hook)
   */
  function moduleType() external view returns (uint256);

  /**
   * @dev Returns whether the module is initialized for the account
   * @param account The account to check
   * @return initialized Whether the module is initialized
   */
  function isInitialized(address account) external view returns (bool);
}

/**
 * @title IValidator
 * @dev Interface for ERC-7579 validator modules
 */
interface IValidator is IModule {
  /**
   * @dev Validates a UserOperation
   * @param userOp The UserOperation to validate
   * @param userOpHash The hash of the UserOperation
   * @return validationData Validation result (0 = valid, 1 = invalid signature, other = invalid with time bounds)
   */
  function validateUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash
  ) external returns (uint256 validationData);

  /**
   * @dev Validates a signature using ERC-1271 standard
   * @param sender The account that should have signed the data
   * @param hash The hash of the data that was signed
   * @param signature The signature to validate
   * @return magicValue ERC-1271 magic value if valid, 0x00000000 if invalid
   */
  function isValidSignatureWithSender(
    address sender,
    bytes32 hash,
    bytes calldata signature
  ) external view returns (bytes4 magicValue);
}

/**
 * @dev Struct representing a packed UserOperation for ERC-4337
 */
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
