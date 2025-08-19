// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import './commons/ModuleAuthDynamic.sol';
import './commons/ModuleReceivers.sol';
import './commons/ModuleCalls.sol';
import './commons/ModuleUpdate.sol';
import '../interfaces/IERC7579Module.sol';

/**
 * @notice Contains the core functionality arcadeum wallets will inherit with
 *         the added functionality that the main-module can be changed.
 *         Now includes ERC-7579 validator compliance.
 * @dev If using a new main module, developpers must ensure that all inherited
 *      contracts by the mainmodule don't conflict and are accounted for to be
 *      supported by the supportsInterface method.
 */
contract MainModuleDynamicAuth is ModuleAuthDynamic, ModuleCalls, ModuleReceivers, ModuleUpdate, IValidator {
  // solhint-disable-next-line no-empty-blocks
  constructor(address _factory, address _startup) ModuleAuthDynamic(_factory, _startup) {}

  /**
   * @notice Query if a contract implements an interface
   * @param _interfaceID The interface identifier, as specified in ERC-165
   * @dev If using a new main module, developpers must ensure that all inherited
   *      contracts by the mainmodule don't conflict and are accounted for to be
   *      supported by the supportsInterface method.
   * @return `true` if the contract implements `_interfaceID`
   */
  function supportsInterface(
    bytes4 _interfaceID
  ) public pure override(ModuleAuthUpgradable, ModuleCalls, ModuleReceivers, ModuleUpdate) returns (bool) {
    // Check for ERC-7579 interfaces
    // IModule interface ID: 0xb26ed2e0 (moduleType ^ isInitialized)
    // IValidator interface ID: 0x6251d0ed (validateUserOp ^ isValidSignatureWithSender)
    if (_interfaceID == 0xb26ed2e0 || _interfaceID == 0x6251d0ed) {
      return true;
    }

    return super.supportsInterface(_interfaceID);
  }

  function version() external pure virtual returns (uint256) {
    return 1;
  }

  // ERC-7579 IModule implementation

  /**
   * @notice Returns the module type for ERC-7579 compliance
   * @return moduleType Returns 1 for Validator module type
   */
  function moduleType() external pure override returns (uint256) {
    return 1; // Validator module type
  }

  /**
   * @notice Returns whether the module is initialized for the account
   * @param account The account to check
   * @return initialized Always returns true as this is the main module
   */
  function isInitialized(address account) external view override returns (bool) {
    // For the main module, we consider it initialized if the account has a valid image hash
    bytes32 imageHash = ModuleStorage.readBytes32(ImageHashKey.IMAGE_HASH_KEY);
    return imageHash != bytes32(0) || account == address(this);
  }

  // ERC-7579 IValidator implementation

  /**
   * @notice Validates a UserOperation for ERC-4337 compatibility
   * @param userOp The UserOperation to validate
   * @param userOpHash The hash of the UserOperation
   * @return validationData 0 if valid, 1 if invalid signature
   */
  function validateUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash
  ) external override returns (uint256 validationData) {
    // Check for minimum signature length to avoid out of bounds errors
    if (userOp.signature.length < 2) {
      return 1; // Invalid signature
    }

    // Validate the signature using the existing signature validation logic
    bool isValid = _signatureValidation(userOpHash, userOp.signature);

    // Return 0 for valid, 1 for invalid signature
    return isValid ? 0 : 1;
  }

  /**
   * @notice Validates a signature using ERC-1271 standard with sender context
   * @param sender The account that should have signed the data
   * @param hash The hash of the data that was signed
   * @param signature The signature to validate
   * @return magicValue ERC-1271 magic value if valid, 0x00000000 if invalid
   */
  function isValidSignatureWithSender(
    address sender,
    bytes32 hash,
    bytes calldata signature
  ) external view override returns (bytes4 magicValue) {
    // Ensure the sender is this contract (the wallet)
    if (sender != address(this)) {
      return 0x00000000;
    }

    // Use the existing ERC-1271 signature validation
    // Call the bytes32 version of isValidSignature
    return this.isValidSignature(hash, signature);
  }
}
