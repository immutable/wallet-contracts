// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC7579Hook} from "../../interfaces/erc7579/IERC7579Hook.sol";
import {InterfaceIds} from "../../utils/erc7579/InterfaceIds.sol";
import {ModuleTypeLib} from "../../utils/erc7579/ModuleTypeLib.sol";

/**
 * @title ImmutableHook
 * @notice ERC-7579 compliant hook module that provides pre/post execution logic
 * @dev Optional module that can be installed to add custom execution hooks
 */
contract ImmutableHook is IERC7579Hook {
    
    /*//////////////////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////////////////*/
    
    event PreCheckExecuted(address indexed account, uint256 indexed value, bytes data);
    event PostCheckExecuted(address indexed account, bytes context);

    /*//////////////////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////////////////*/
    
    /// @notice Mapping to track which accounts have this hook installed
    mapping(address => bool) public installedAccounts;
    
    /// @notice Mapping to store hook configuration per account
    mapping(address => bytes) public hookConfig;

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Called when the module is installed on a smart account
     * @param data Initialization data (hook configuration)
     */
    function onInstall(bytes calldata data) external override {
        installedAccounts[msg.sender] = true;
        
        if (data.length > 0) {
            hookConfig[msg.sender] = data;
        }
        
        // Module is now installed and ready to provide hooks
    }

    /**
     * @notice Called when the module is uninstalled from a smart account
     * @param data Deinitialization data
     */
    function onUninstall(bytes calldata data) external override {
        installedAccounts[msg.sender] = false;
        delete hookConfig[msg.sender];
    }

    /**
     * @notice Returns the module type ID
     * @return moduleTypeId The module type ID (4 for hook)
     */
    function moduleType() external pure override returns (uint256) {
        return ModuleTypeLib.TYPE_HOOK;
    }

    /**
     * @notice Checks if the module is initialized for a smart account
     * @param smartAccount The smart account address
     * @return True if the module is initialized
     */
    function isInitialized(address smartAccount) external view returns (bool) {
        return installedAccounts[smartAccount];
    }

    /*//////////////////////////////////////////////////////////////////////////
                                HOOK INTERFACE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Pre-execution hook called before transaction execution
     * @param msgSender The address that initiated the transaction
     * @param value The value being sent with the transaction
     * @param msgData The transaction data
     * @return hookData Context data to pass to post-execution hook
     */
    function preCheck(
        address msgSender,
        uint256 value,
        bytes calldata msgData
    ) external override returns (bytes memory hookData) {
        // Only allow installed accounts to call this hook
        require(installedAccounts[msg.sender], "ImmutableHook: NOT_INSTALLED");
        
        // Perform pre-execution checks
        _performPreChecks(msgSender, value, msgData);
        
        // Emit event for monitoring
        emit PreCheckExecuted(msg.sender, value, msgData);
        
        // Return context data for post-execution hook
        hookData = abi.encode(msgSender, value, block.timestamp);
    }

    /**
     * @notice Post-execution hook called after transaction execution
     * @param hookData Context data from pre-execution hook
     */
    function postCheck(bytes calldata hookData) external override {
        // Only allow installed accounts to call this hook
        require(installedAccounts[msg.sender], "ImmutableHook: NOT_INSTALLED");
        
        // Decode context data
        (address msgSender, uint256 value, uint256 timestamp) = abi.decode(
            hookData, 
            (address, uint256, uint256)
        );
        
        // Perform post-execution checks
        _performPostChecks(msgSender, value, timestamp);
        
        // Emit event for monitoring
        emit PostCheckExecuted(msg.sender, hookData);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                CONFIGURATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Updates hook configuration for the calling account
     * @param newConfig New configuration data
     */
    function updateConfig(bytes calldata newConfig) external {
        require(installedAccounts[msg.sender], "ImmutableHook: NOT_INSTALLED");
        hookConfig[msg.sender] = newConfig;
    }

    /**
     * @notice Gets hook configuration for an account
     * @param account The account address
     * @return config The hook configuration
     */
    function getConfig(address account) external view returns (bytes memory config) {
        return hookConfig[account];
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-165 SUPPORT
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if the contract supports an interface
     * @param interfaceId The interface ID to check
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        pure 
        override 
        returns (bool) 
    {
        return
            interfaceId == InterfaceIds.IERC7579_HOOK_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC7579_MODULE_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC165_INTERFACE_ID;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Performs pre-execution checks
     * @param msgSender The transaction sender
     * @param value The transaction value
     * @param msgData The transaction data
     */
    function _performPreChecks(
        address msgSender,
        uint256 value,
        bytes calldata msgData
    ) internal view {
        // Example pre-execution checks:
        // - Gas limit validation
        // - Value limit validation
        // - Target address validation
        // - Rate limiting
        
        // For now, we'll keep it simple
        // In a real implementation, you might want to:
        // 1. Check against spending limits
        // 2. Validate target addresses against allowlists
        // 3. Implement rate limiting
        // 4. Check for suspicious patterns
    }

    /**
     * @notice Performs post-execution checks
     * @param msgSender The transaction sender
     * @param value The transaction value
     * @param timestamp The execution timestamp
     */
    function _performPostChecks(
        address msgSender,
        uint256 value,
        uint256 timestamp
    ) internal view {
        // Example post-execution checks:
        // - Execution time validation
        // - State change validation
        // - Event emission validation
        
        // For now, we'll keep it simple
        // In a real implementation, you might want to:
        // 1. Validate that expected state changes occurred
        // 2. Check execution time for performance monitoring
        // 3. Validate emitted events
        // 4. Update usage statistics
    }
}
