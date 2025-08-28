// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ModuleTypeLib} from "../utils/erc7579/ModuleTypeLib.sol";
import {InterfaceIds} from "../utils/erc7579/InterfaceIds.sol";
import {IERC7579Module} from "../interfaces/erc7579/IERC7579Module.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title ModuleManagementLib
 * @notice Library for handling ERC-7579 module management logic
 * @dev Extracts complex module management functions to reduce main contract size
 */
library ModuleManagementLib {
    /*//////////////////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////////////////*/

    event ModuleInstalled(uint256 indexed moduleTypeId, address indexed module);
    event ModuleUninstalled(uint256 indexed moduleTypeId, address indexed module);

    /*//////////////////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////////////////*/

    error InvalidModuleType();
    error ModuleAlreadyInstalled();
    error ModuleNotInstalled();
    error InvalidModuleInterface();
    error ModuleInstallFailed();
    error ModuleUninstallFailed();
    error CannotRemoveLastValidator();

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE INSTALLATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Installs a module with full validation
     * @param installedModules Storage mapping of installed modules
     * @param modulesByType Storage mapping of modules by type
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @param initData Initialization data for the module
     */
    function installModuleWithValidation(
        mapping(uint256 => mapping(address => bool)) storage installedModules,
        mapping(uint256 => address[]) storage modulesByType,
        uint256 moduleTypeId,
        address module,
        bytes calldata initData
    ) external {
        // Validate module type
        if (!ModuleTypeLib.isValidModuleType(moduleTypeId)) {
            revert InvalidModuleType();
        }
        
        // Check if module is already installed
        if (installedModules[moduleTypeId][module]) {
            revert ModuleAlreadyInstalled();
        }
        
        // Validate module implements correct interface
        if (!validateModuleInterface(moduleTypeId, module)) {
            revert InvalidModuleInterface();
        }

        // Install the module
        installedModules[moduleTypeId][module] = true;
        modulesByType[moduleTypeId].push(module);

        // Call onInstall on the module
        if (initData.length > 0) {
            (bool success,) = module.call(
                abi.encodeWithSignature("onInstall(bytes)", initData)
            );
            if (!success) revert ModuleInstallFailed();
        }

        emit ModuleInstalled(moduleTypeId, module);
    }

    /**
     * @notice Uninstalls a module with full validation
     * @param installedModules Storage mapping of installed modules
     * @param modulesByType Storage mapping of modules by type
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @param deInitData Deinitialization data for the module
     */
    function uninstallModuleWithValidation(
        mapping(uint256 => mapping(address => bool)) storage installedModules,
        mapping(uint256 => address[]) storage modulesByType,
        uint256 moduleTypeId,
        address module,
        bytes calldata deInitData
    ) external {
        // Check if module is installed
        if (!installedModules[moduleTypeId][module]) {
            revert ModuleNotInstalled();
        }
        
        // Prevent uninstalling the last validator (security requirement)
        if (moduleTypeId == ModuleTypeLib.TYPE_VALIDATOR) {
            if (modulesByType[moduleTypeId].length <= 1) {
                revert CannotRemoveLastValidator();
            }
        }

        // Call onUninstall on the module
        if (deInitData.length > 0) {
            (bool success,) = module.call(
                abi.encodeWithSignature("onUninstall(bytes)", deInitData)
            );
            if (!success) revert ModuleUninstallFailed();
        }

        // Uninstall the module
        installedModules[moduleTypeId][module] = false;
        removeFromModuleList(modulesByType, moduleTypeId, module);

        emit ModuleUninstalled(moduleTypeId, module);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE VALIDATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Validates that a module implements the correct interface for its type
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @return True if the module implements the correct interface
     */
    function validateModuleInterface(uint256 moduleTypeId, address module) public view returns (bool) {
        // Check if module supports ERC-165
        try IERC165(module).supportsInterface(InterfaceIds.IERC165_INTERFACE_ID) returns (bool supportsERC165) {
            if (!supportsERC165) return false;
        } catch {
            return false;
        }

        // Check if module supports base module interface
        try IERC165(module).supportsInterface(InterfaceIds.IERC7579_MODULE_INTERFACE_ID) returns (bool supportsModuleInterface) {
            if (!supportsModuleInterface) return false;
        } catch {
            return false;
        }

        // Check type-specific interface
        if (moduleTypeId == ModuleTypeLib.TYPE_VALIDATOR) {
            try IERC165(module).supportsInterface(InterfaceIds.IERC7579_VALIDATOR_INTERFACE_ID) returns (bool result) {
                return result;
            } catch {
                return false;
            }
        } else if (moduleTypeId == ModuleTypeLib.TYPE_EXECUTOR) {
            try IERC165(module).supportsInterface(InterfaceIds.IERC7579_EXECUTOR_INTERFACE_ID) returns (bool result) {
                return result;
            } catch {
                return false;
            }
        } else if (moduleTypeId == ModuleTypeLib.TYPE_HOOK) {
            try IERC165(module).supportsInterface(InterfaceIds.IERC7579_HOOK_INTERFACE_ID) returns (bool result) {
                return result;
            } catch {
                return false;
            }
        }

        // Fallback handlers just need the base module interface
        return true;
    }

    /**
     * @notice Batch validates multiple modules
     * @param moduleTypeIds Array of module type IDs
     * @param modules Array of module addresses
     * @return results Array of validation results
     */
    function batchValidateModules(
        uint256[] calldata moduleTypeIds,
        address[] calldata modules
    ) external view returns (bool[] memory results) {
        require(moduleTypeIds.length == modules.length, "Array length mismatch");
        
        results = new bool[](modules.length);
        for (uint256 i = 0; i < modules.length; i++) {
            results[i] = validateModuleInterface(moduleTypeIds[i], modules[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Removes a module from the module list
     * @param modulesByType Storage mapping of modules by type
     * @param moduleTypeId The module type ID
     * @param module The module address to remove
     */
    function removeFromModuleList(
        mapping(uint256 => address[]) storage modulesByType,
        uint256 moduleTypeId,
        address module
    ) public {
        address[] storage modules = modulesByType[moduleTypeId];
        for (uint256 i = 0; i < modules.length; i++) {
            if (modules[i] == module) {
                modules[i] = modules[modules.length - 1];
                modules.pop();
                break;
            }
        }
    }

    /**
     * @notice Gets the count of installed modules for a type
     * @param modulesByType Storage mapping of modules by type
     * @param moduleTypeId The module type ID
     * @return count The number of installed modules
     */
    function getModuleCount(
        mapping(uint256 => address[]) storage modulesByType,
        uint256 moduleTypeId
    ) external view returns (uint256 count) {
        return modulesByType[moduleTypeId].length;
    }

    /**
     * @notice Checks if any modules of a type are installed
     * @param modulesByType Storage mapping of modules by type
     * @param moduleTypeId The module type ID
     * @return hasModules True if any modules are installed
     */
    function hasModulesOfType(
        mapping(uint256 => address[]) storage modulesByType,
        uint256 moduleTypeId
    ) external view returns (bool hasModules) {
        return modulesByType[moduleTypeId].length > 0;
    }
}
