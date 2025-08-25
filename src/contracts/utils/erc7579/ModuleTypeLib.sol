// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

/**
 * @title ModuleTypeLib
 * @notice Library containing constants and utilities for ERC-7579 module types
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
library ModuleTypeLib {
    /*//////////////////////////////////////////////////////////////////////////
                                MODULE TYPES
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Module type for validators
    uint256 internal constant TYPE_VALIDATOR = 1;
    
    /// @notice Module type for executors  
    uint256 internal constant TYPE_EXECUTOR = 2;
    
    /// @notice Module type for fallback handlers
    uint256 internal constant TYPE_FALLBACK = 3;
    
    /// @notice Module type for hooks
    uint256 internal constant TYPE_HOOK = 4;

    /*//////////////////////////////////////////////////////////////////////////
                                VALIDATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Validates if a module type ID is valid
     * @param moduleTypeId The module type ID to validate
     * @return True if valid, false otherwise
     */
    function isValidModuleType(uint256 moduleTypeId) internal pure returns (bool) {
        return moduleTypeId >= TYPE_VALIDATOR && moduleTypeId <= TYPE_HOOK;
    }

    /**
     * @notice Gets the name of a module type
     * @param moduleTypeId The module type ID
     * @return The name of the module type
     */
    function getModuleTypeName(uint256 moduleTypeId) internal pure returns (string memory) {
        if (moduleTypeId == TYPE_VALIDATOR) return "Validator";
        if (moduleTypeId == TYPE_EXECUTOR) return "Executor";
        if (moduleTypeId == TYPE_FALLBACK) return "Fallback";
        if (moduleTypeId == TYPE_HOOK) return "Hook";
        return "Unknown";
    }

    /*//////////////////////////////////////////////////////////////////////////
                                UTILITIES
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if a module type is a validator
     * @param moduleTypeId The module type ID to check
     * @return True if validator, false otherwise
     */
    function isValidator(uint256 moduleTypeId) internal pure returns (bool) {
        return moduleTypeId == TYPE_VALIDATOR;
    }

    /**
     * @notice Checks if a module type is an executor
     * @param moduleTypeId The module type ID to check
     * @return True if executor, false otherwise
     */
    function isExecutor(uint256 moduleTypeId) internal pure returns (bool) {
        return moduleTypeId == TYPE_EXECUTOR;
    }

    /**
     * @notice Checks if a module type is a fallback handler
     * @param moduleTypeId The module type ID to check
     * @return True if fallback handler, false otherwise
     */
    function isFallback(uint256 moduleTypeId) internal pure returns (bool) {
        return moduleTypeId == TYPE_FALLBACK;
    }

    /**
     * @notice Checks if a module type is a hook
     * @param moduleTypeId The module type ID to check
     * @return True if hook, false otherwise
     */
    function isHook(uint256 moduleTypeId) internal pure returns (bool) {
        return moduleTypeId == TYPE_HOOK;
    }
}
