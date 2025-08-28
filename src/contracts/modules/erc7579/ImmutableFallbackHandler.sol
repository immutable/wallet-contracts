// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "../../interfaces/erc7579/IERC7579Module.sol";
import "../../utils/erc7579/InterfaceIds.sol";
import "../../utils/erc7579/ModuleTypeLib.sol";
import "../commons/ModuleHooks.sol";

/**
 * @title ImmutableFallbackHandler
 * @notice ERC-7579 compliant fallback handler module that implements Immutable's hook functionality
 * @dev Extracts the existing ModuleHooks functionality into a standalone ERC-7579 module
 */
contract ImmutableFallbackHandler is IERC7579Module, ModuleHooks {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Constructor for ImmutableFallbackHandler
     * @param _factory Address of the wallet factory (unused but kept for consistency)
     */
    constructor(address _factory) {
        // ModuleHooks doesn't have a constructor, so we don't call it
        // _factory parameter is kept for consistency with other modules
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Called when the module is installed on a smart account
     * @param data Initialization data (encoded hook configuration)
     */
    function onInstall(bytes calldata data) external override {
        // Initialize the module with hook configuration
        if (data.length > 0) {
            // Decode initialization data for hook setup
            // This could include default hook addresses, etc.
        }
        
        // Module is now installed and ready to handle fallback calls
    }

    /**
     * @notice Called when the module is uninstalled from a smart account
     * @param data Deinitialization data
     */
    function onUninstall(bytes calldata data) external override {
        // Clean up any module-specific storage
        // Clear registered hooks if needed
    }

    /**
     * @notice Returns the module type ID
     * @return moduleTypeId The module type ID (3 for fallback)
     */
    function moduleType() external pure override returns (uint256) {
        return ModuleTypeLib.TYPE_FALLBACK;
    }

    /**
     * @notice Checks if the module is initialized for a smart account
     * @param smartAccount The smart account address
     * @return True if the module is initialized
     */
    function isInitialized(address smartAccount) external view returns (bool) {
        // Check if the module has been properly initialized
        return true; // For now, assume always initialized
    }

    /*//////////////////////////////////////////////////////////////////////////
                                FALLBACK HANDLING
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Handles fallback calls for unknown function selectors
     * @param callData The call data for the unknown function
     * @return result The result of the fallback call
     */
    function handleFallback(bytes calldata callData) external returns (bytes memory result) {
        // Extract function selector
        bytes4 selector = bytes4(callData[:4]);
        
        // Use existing hook logic to find and call appropriate handler
        address hook = this.readHook(selector);
        
        if (hook != address(0)) {
            // Delegate to the registered hook
            (bool success, bytes memory returnData) = hook.delegatecall(callData);
            require(success, "ImmutableFallbackHandler: HOOK_CALL_FAILED");
            return returnData;
        }
        
        // If no hook is registered, revert
        revert("ImmutableFallbackHandler: NO_HOOK_REGISTERED");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                HOOK MANAGEMENT
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Registers a hook for a specific function selector
     * @param selector The function selector
     * @param implementation The hook implementation address
     */
    function registerHook(bytes4 selector, address implementation) external {
        // Only allow the account itself to register hooks
        require(msg.sender == address(this), "ImmutableFallbackHandler: UNAUTHORIZED");
        
        // Use existing hook registration logic
        _setHook(selector, implementation);
    }

    /**
     * @notice Unregisters a hook for a specific function selector
     * @param selector The function selector
     */
    function unregisterHook(bytes4 selector) external {
        // Only allow the account itself to unregister hooks
        require(msg.sender == address(this), "ImmutableFallbackHandler: UNAUTHORIZED");
        
        // Clear the hook
        _setHook(selector, address(0));
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
        override(ModuleHooks, IERC7579Module) 
        returns (bool) 
    {
        return
            interfaceId == InterfaceIds.IERC7579_MODULE_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC165_INTERFACE_ID ||
            super.supportsInterface(interfaceId);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Internal function to set a hook (wraps existing logic)
     * @param selector The function selector
     * @param implementation The hook implementation
     */
    function _setHook(bytes4 selector, address implementation) internal {
        // Use existing ModuleHooks logic
        // This maintains backward compatibility
        if (implementation != address(0)) {
            this.addHook(selector, implementation);
        } else {
            this.removeHook(selector);
        }
    }
}
