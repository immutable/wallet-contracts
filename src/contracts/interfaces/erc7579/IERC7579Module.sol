// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IERC7579Module
 * @notice Interface for ERC-7579 compliant modules
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
interface IERC7579Module is IERC165 {
    /*//////////////////////////////////////////////////////////////////////////
                                MODULE TYPES
    //////////////////////////////////////////////////////////////////////////*/

    // Note: Module type constants are defined in ModuleTypeLib.sol
    // TYPE_VALIDATOR = 1
    // TYPE_EXECUTOR = 2  
    // TYPE_FALLBACK = 3
    // TYPE_HOOK = 4

    /*//////////////////////////////////////////////////////////////////////////
                                 LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Called when the module is installed on a smart account
     * @param data Arbitrary data that may be required during installation
     * 
     * @dev MUST revert if the module is not compatible with the account or the data is invalid
     */
    function onInstall(bytes calldata data) external;

    /**
     * @notice Called when the module is uninstalled from a smart account
     * @param data Arbitrary data that may be required during uninstallation
     * 
     * @dev MUST revert if the uninstallation is not allowed or the data is invalid
     */
    function onUninstall(bytes calldata data) external;

    /*//////////////////////////////////////////////////////////////////////////
                                 METADATA
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the module type ID
     * @return moduleTypeId The module type ID according to the ERC-7579 spec
     * 
     * @dev MUST return a valid module type ID (1, 2, 3, or 4)
     */
    function moduleType() external view returns (uint256 moduleTypeId);

    /**
     * @notice Returns whether the module supports a certain interface
     * @param interfaceId The interface ID to check
     * @return True if the module supports the interface, false otherwise
     * 
     * @dev MUST return true for IERC7579Module interface
     * @dev MUST return true for IERC165 interface  
     * @dev SHOULD return true for type-specific interfaces
     */
    function supportsInterface(bytes4 interfaceId) external view override returns (bool);
}
