// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IERC7579Account
 * @notice Interface for ERC-7579 compliant modular smart accounts
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
interface IERC7579Account is IERC165 {
    /*//////////////////////////////////////////////////////////////////////////
                                     EVENTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a module is installed
    event ModuleInstalled(uint256 moduleTypeId, address module);

    /// @notice Emitted when a module is uninstalled  
    event ModuleUninstalled(uint256 moduleTypeId, address module);

    /*//////////////////////////////////////////////////////////////////////////
                                   EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a transaction on behalf of the account
     * @param mode The encoded execution mode of the transaction
     * @param executionCalldata The encoded execution call data
     * 
     * @dev MUST ensure adequate authorization control (e.g. onlyEntryPointOrSelf if used with ERC-4337)
     * @dev If a mode is requested that is not supported by the Account, it MUST revert
     */
    function execute(bytes32 mode, bytes calldata executionCalldata) external;

    /**
     * @notice Executes a transaction on behalf of the account
     * @dev This function is intended to be called by Executor Modules
     * @param mode The encoded execution mode of the transaction
     * @param executionCalldata The encoded execution call data
     * @return returnData An array with the returned data of each executed subcall
     * 
     * @dev MUST ensure adequate authorization control (i.e. onlyExecutorModule)
     * @dev If a mode is requested that is not supported by the Account, it MUST revert
     */
    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        returns (bytes[] memory returnData);

    /*//////////////////////////////////////////////////////////////////////////
                                 CONFIGURATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the account id of the smart account
     * @return accountImplementationId The account id of the smart account
     * 
     * @dev MUST return a non-empty string
     * @dev The accountId SHOULD be structured like: "vendorname.accountname.semver"
     * @dev The id SHOULD be unique across all smart accounts
     */
    function accountId() external view returns (string memory accountImplementationId);

    /**
     * @notice Function to check if the account supports a certain execution mode
     * @param encodedMode The encoded mode
     * @return True if the account supports the mode and false otherwise
     */
    function supportsExecutionMode(bytes32 encodedMode) external view returns (bool);

    /**
     * @notice Function to check if the account supports a certain module typeId
     * @param moduleTypeId The module type ID according to the ERC-7579 spec
     * @return True if the account supports the module type and false otherwise
     */
    function supportsModule(uint256 moduleTypeId) external view returns (bool);

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE MANAGEMENT
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Installs a Module of a certain type on the smart account
     * @param moduleTypeId The module type ID according to the ERC-7579 spec
     * @param module The module address
     * @param initData Arbitrary data that may be required on the module during `onInstall` initialization
     * 
     * @dev MUST implement authorization control
     * @dev MUST call `onInstall` on the module with the `initData` parameter if provided
     * @dev MUST emit ModuleInstalled event
     * @dev MUST revert if the module is already installed or the initialization on the module failed
     */
    function installModule(uint256 moduleTypeId, address module, bytes calldata initData) external;

    /**
     * @notice Uninstalls a Module of a certain type on the smart account
     * @param moduleTypeId The module type ID according to the ERC-7579 spec
     * @param module The module address
     * @param deInitData Arbitrary data that may be required on the module during `onUninstall` deinitialization
     * 
     * @dev MUST implement authorization control
     * @dev MUST call `onUninstall` on the module with the `deInitData` parameter if provided
     * @dev MUST emit ModuleUninstalled event
     * @dev MUST revert if the module is not installed or the deinitialization on the module failed
     */
    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) external;

    /**
     * @notice Returns whether a module is installed on the smart account
     * @param moduleTypeId The module type ID according to the ERC-7579 spec
     * @param module The module address
     * @param additionalContext Arbitrary data that may be required to determine if the module is installed
     * @return True if the module is installed and false otherwise
     */
    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata additionalContext)
        external
        view
        returns (bool);

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-165 SUPPORT
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns whether the account supports a certain interface
     * @param interfaceId The interface ID to check
     * @return True if the account supports the interface, false otherwise
     * 
     * @dev MUST return true for IERC7579Account interface
     * @dev MUST return true for IERC165 interface
     * @dev SHOULD return true for IERC1271 interface if signature validation is supported
     */
    function supportsInterface(bytes4 interfaceId) external view override returns (bool);
}
