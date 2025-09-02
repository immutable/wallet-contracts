// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { IAccountConfig } from "../modules/commons/interfaces/base/IAccountConfig.sol";
import { IExecutionHelper } from "../modules/commons/interfaces/base/IExecutionHelper.sol";
import { IModuleManager } from "../modules/commons/interfaces/base/IModuleManager.sol";

/// @title Immutable Wallet V2 - IERC7579Account
/// @notice This interface integrates the functionalities required for a modular smart account compliant with ERC-7579 and ERC-4337 standards.
/// @dev Combines configurations and operational management for smart accounts, bridging IAccountConfig, IExecutionHelper, and IModuleManager.
/// Interfaces designed to support the comprehensive management of smart account operations including execution management and modular configurations.

/// This file has been adapted from the Nexus suite, which can be found at: https://github.com/rhinestonewtf/nexus/blob/main/contracts/interfaces/IERC7579Account.sol
interface IERC7579Account is IAccountConfig, IExecutionHelper {
    /// @dev Validates a smart account signature according to ERC-1271 standards.
    /// This method may delegate the call to a validator module to check the signature.
    /// @param hash The hash of the data being validated.
    /// @param data The signed data to validate.
    function isValidSignature(bytes32 hash, bytes calldata data) external view returns (bytes4);
}
