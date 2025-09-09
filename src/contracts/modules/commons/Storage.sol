// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IStorage } from "./interfaces/base/IStorage.sol";

/// @title Nexus - Storage
/// @notice Manages isolated storage spaces for Modular Smart Account in compliance with ERC-7201 standard to ensure collision-resistant storage.
/// @dev Implements the ERC-7201 namespaced storage pattern to maintain secure and isolated storage sections for different states within Nexus suite.

/// This file has been adapted from the Nexus suite, which can be found at: https://github.com/rhinestonewtf/nexus/blob/main/contracts/Storage.sol
contract Storage is IStorage {
    /// @custom:storage-location erc7201:biconomy.storage.Nexus
    /// ERC-7201 namespaced via `keccak256(abi.encode(uint256(keccak256(bytes("biconomy.storage.Nexus"))) - 1)) & ~bytes32(uint256(0xff));`
    bytes32 private constant _STORAGE_LOCATION = 0x0bb70095b32b9671358306b0339b4c06e7cbd8cb82505941fba30d1eb5b82f00;

    /// @dev Utilizes ERC-7201's namespaced storage pattern for isolated storage access. This method computes
    /// the storage slot based on a predetermined location, ensuring collision-resistant storage for contract states.
    /// @custom:storage-location ERC-7201 formula applied to "biconomy.storage.Nexus", facilitating unique
    /// namespace identification and storage segregation, as detailed in the specification.
    /// @return $ The proxy to the `AccountStorage` struct, providing a reference to the namespaced storage slot.
    function _getAccountStorage() internal pure returns (AccountStorage storage $) {
        assembly {
            $.slot := _STORAGE_LOCATION
        }
    }
}
