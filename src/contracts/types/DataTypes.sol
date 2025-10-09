// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @title Execution
/// @notice Struct to encapsulate execution data for a transaction

/// @title Passport Wallet V2 - DataTypes
/// @notice Defines common data structures used throughout the Passport Wallet V2 suite
/// @dev Contains struct definitions for execution, module management, and other core operations

/// This file has been adapted from the Nexus suite, which can be found at: https://github.com/rhinestonewtf/nexus/blob/main/contracts/types/DataTypes.sol

/// @title Execution
/// @notice Struct to encapsulate execution data for a transaction
struct Execution {
    /// @notice The target address for the transaction
    address target;
    /// @notice The value in wei to send with the transaction
    uint256 value;
    /// @notice The calldata for the transaction
    bytes callData;
}

/// @title Emergency Uninstall
/// @notice Struct to encapsulate emergency uninstall data for a hook
struct EmergencyUninstall {
    /// @notice The address of the hook to be uninstalled
    address hook;
    /// @notice The hook type identifier
    uint256 hookType;
    /// @notice Data used to uninstall the hook
    bytes deInitData;
    /// @notice Nonce used to prevent replay attacks
    uint256 nonce;
}
