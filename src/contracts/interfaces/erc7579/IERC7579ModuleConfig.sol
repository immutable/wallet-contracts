// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IERC7579ModuleConfig
 * @notice Interface for ERC-7579 compliant modules
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
interface IERC7579ModuleConfig is IERC165 {
    event ModuleInstalled(uint256 moduleTypeId, address module);
    event ModuleUninstalled(uint256 moduleTypeId, address module);

    /**
     * @dev Installs a Module of a certain type on the smart account
     * @param moduleTypeId the module type ID according to the ERC-7579 spec
     * @param module the module address
     * @param initData arbitrary data that may be required on the module during `onInstall`
     * initialization.
     *
     * MUST implement authorization control
     * MUST call `onInstall` on the module with the `initData` parameter if provided
     * MUST emit ModuleInstalled event
     * MUST revert if the module is already installed or the initialization on the module failed
     */
    function installModule(uint256 moduleTypeId, address module, bytes calldata initData) external;

    /**
     * @dev Uninstalls a Module of a certain type on the smart account
     * @param moduleTypeId the module type ID according the ERC-7579 spec
     * @param module the module address
     * @param deInitData arbitrary data that may be required on the module during `onInstall`
     * initialization.
     *
     * MUST implement authorization control
     * MUST call `onUninstall` on the module with the `deInitData` parameter if provided
     * MUST emit ModuleUninstalled event
     * MUST revert if the module is not installed or the deInitialization on the module failed
     */
    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) external;

    /**
     * @dev Returns whether a module is installed on the smart account
     * @param moduleTypeId the module type ID according the ERC-7579 spec
     * @param module the module address
     * @param additionalContext arbitrary data that may be required to determine if the module is installed
     *
     * MUST return true if the module is installed and false otherwise
     */
    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata additionalContext) external view returns (bool);
}
