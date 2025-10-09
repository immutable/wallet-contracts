// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import '../modules/commons/interfaces/modules/IValidator.sol';
import {PackedUserOperation} from 'account-abstraction/interfaces/PackedUserOperation.sol';

/// @title MockValidator
/// @notice Mock validator module for testing MainModuleDynamicAuthV2 integration
/// @dev Simulates a validator module that can be installed and used for signature validation
contract MockValidator is IValidator {
  mapping(address => bool) private _initialized;
  mapping(address => address) private _authorizedSigners;

  // Events for testing
  event ValidatorInstalled(address smartAccount, bytes data);
  event ValidatorUninstalled(address smartAccount, bytes data);
  event UserOpValidated(address smartAccount, bytes32 userOpHash, uint256 result);
  event SignatureValidated(address sender, bytes32 hash, bytes data, bytes4 result);

  /// @notice Installs the module with necessary initialization data
  /// @param data Encoded address of the authorized signer for this smart account
  function onInstall(bytes calldata data) external override {
    require(!_initialized[msg.sender], 'MockValidator: Already initialized');

    address authorizedSigner = address(0);
    if (data.length >= 20) {
      authorizedSigner = address(bytes20(data[0:20]));
    }

    _initialized[msg.sender] = true;
    _authorizedSigners[msg.sender] = authorizedSigner;

    emit ValidatorInstalled(msg.sender, data);
  }

  /// @notice Uninstalls the module and allows for cleanup
  function onUninstall(bytes calldata data) external override {
    require(_initialized[msg.sender], 'MockValidator: Not initialized');

    _initialized[msg.sender] = false;
    _authorizedSigners[msg.sender] = address(0);

    emit ValidatorUninstalled(msg.sender, data);
  }

  /// @notice Determines if the module matches the validator module type
  function isModuleType(uint256 moduleTypeId) external pure override returns (bool) {
    return moduleTypeId == 1; // MODULE_TYPE_VALIDATOR
  }

  /// @notice Checks if the module has been initialized for a specific smart account
  function isInitialized(address smartAccount) external view override returns (bool) {
    return _initialized[smartAccount];
  }

  /// @notice Validates a user operation (simplified for testing)
  /// @param userOp The user operation to validate
  /// @param userOpHash The hash of the user operation
  /// @return status 0 for success, 1 for failure
  function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash) external override returns (uint256) {
    require(_initialized[msg.sender], 'MockValidator: Not initialized');

    // Simple validation: just check if signature length is correct
    uint256 result = userOp.signature.length >= 65 ? 0 : 1;

    emit UserOpValidated(msg.sender, userOpHash, result);
    return result;
  }

  /// @notice Validates a signature with sender context
  /// @param sender The address that initiated the operation
  /// @param data The signature data
  /// @return magicValue ERC-1271 magic value if valid, 0xffffffff if invalid
  function isValidSignatureWithSender(
    address sender,
    bytes32 /* hash */,
    bytes calldata data
  ) external view override returns (bytes4) {
    require(_initialized[msg.sender], 'MockValidator: Not initialized');

    bytes4 result;

    // Simple validation: check signature length and authorized signer
    if (data.length >= 65) {
      address authorizedSigner = _authorizedSigners[msg.sender];
      if (authorizedSigner == address(0) || authorizedSigner == sender) {
        result = 0x1626ba7e; // ERC-1271 magic value
      } else {
        result = 0xffffffff;
      }
    } else {
      result = 0xffffffff;
    }

    // Note: We can't emit events in view functions, so we skip the event here
    return result;
  }

  /// @notice Get the authorized signer for a smart account (helper for testing)
  function getAuthorizedSigner(address smartAccount) external view returns (address) {
    return _authorizedSigners[smartAccount];
  }
}
