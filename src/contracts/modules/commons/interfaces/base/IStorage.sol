// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { SentinelListLib } from "sentinellist/SentinelList.sol";
import { IPreValidationHookERC1271, IPreValidationHookERC4337 } from "../modules/IPreValidationHook.sol";
import { IHook } from "../modules/IHook.sol";
import { CallType } from "../../../../lib/ModeLib.sol";

/// @title Passport Wallet V2 - IStorage Interface
/// @notice Provides structured storage for Modular Smart Account under the Passport Wallet V2 suite, compliant with ERC-7579 and ERC-4337.
/// @dev Manages structured storage using SentinelListLib for validators and executors, and a mapping for fallback handlers.
/// This interface utilizes ERC-7201 storage location practices to ensure isolated and collision-resistant storage spaces within smart contracts.
/// It is designed to support dynamic execution and modular management strategies essential for advanced smart account architectures.
/// @custom:storage-location erc7201:immutable.wallet.PassportV2

/// This file has been adapted from the Nexus suite, which can be found at: https://github.com/rhinestonewtf/nexus/blob/main/contracts/interfaces/base/IStorage.sol

interface IStorage {
    /// @notice Struct storing validators and executors using Sentinel lists, and fallback handlers via mapping.
    struct AccountStorage {
        ///< List of validators, initialized upon contract deployment.
        SentinelListLib.SentinelList validators;
        ///< List of executors, similarly initialized.
        SentinelListLib.SentinelList executors;
        ///< Mapping of selectors to their respective fallback handlers.
        mapping(bytes4 => FallbackHandler) fallbacks;
        ///< Current hook module associated with this account.
        IHook hook;
        ///< Mapping of hooks to requested timelocks.
        mapping(address hook => uint256) emergencyUninstallTimelock;
        ///< PreValidation hook for validateUserOp
        IPreValidationHookERC4337 preValidationHookERC4337;
        ///< PreValidation hook for isValidSignature
        IPreValidationHookERC1271 preValidationHookERC1271;
        ///< Mapping of used nonces for replay protection.
        mapping(uint256 => bool) nonces;
        ///< ERC-7484 registry
        address registry;
        ///< Mapping of used 7702 init hashes for replay protection.
        mapping(bytes32 => bool) erc7702InitHashes;
    }

    /// @notice Defines a fallback handler with an associated handler address and a call type.
    struct FallbackHandler {
        ///< The address of the fallback function handler.
        address handler;
        ///< The type of call this handler supports (e.g., static or call).
        CallType calltype;
    }
}
