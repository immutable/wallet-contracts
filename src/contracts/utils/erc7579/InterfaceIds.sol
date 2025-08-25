// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

/**
 * @title InterfaceIds
 * @notice Library containing ERC-7579 interface IDs for ERC-165 compliance
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
library InterfaceIds {
    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 INTERFACE IDS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Interface ID for IERC7579Account
    /// @dev Calculated as bytes4(keccak256("IERC7579Account"))
    bytes4 internal constant IERC7579_ACCOUNT_INTERFACE_ID = 0x6ac75bb4;

    /// @notice Interface ID for IERC7579Module  
    /// @dev Calculated as bytes4(keccak256("IERC7579Module"))
    bytes4 internal constant IERC7579_MODULE_INTERFACE_ID = 0x74420f4c;

    /// @notice Interface ID for IERC7579Validator
    /// @dev Calculated as bytes4(keccak256("IERC7579Validator"))  
    bytes4 internal constant IERC7579_VALIDATOR_INTERFACE_ID = 0xd2eebcb4;

    /// @notice Interface ID for IERC7579Executor
    /// @dev Calculated as bytes4(keccak256("IERC7579Executor"))
    bytes4 internal constant IERC7579_EXECUTOR_INTERFACE_ID = 0x4ae0402c;

    /// @notice Interface ID for IERC7579Hook
    /// @dev Calculated as bytes4(keccak256("IERC7579Hook"))
    bytes4 internal constant IERC7579_HOOK_INTERFACE_ID = 0x83b5ab8f;

    /*//////////////////////////////////////////////////////////////////////////
                                STANDARD INTERFACE IDS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Interface ID for ERC-165
    bytes4 internal constant IERC165_INTERFACE_ID = 0x01ffc9a7;

    /// @notice Interface ID for ERC-1271
    bytes4 internal constant IERC1271_INTERFACE_ID = 0x1626ba7e;

    /*//////////////////////////////////////////////////////////////////////////
                                VALIDATION HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if an interface ID is a valid ERC-7579 interface
     * @param interfaceId The interface ID to check
     * @return True if it's a valid ERC-7579 interface, false otherwise
     */
    function isERC7579Interface(bytes4 interfaceId) internal pure returns (bool) {
        return interfaceId == IERC7579_ACCOUNT_INTERFACE_ID ||
               interfaceId == IERC7579_MODULE_INTERFACE_ID ||
               interfaceId == IERC7579_VALIDATOR_INTERFACE_ID ||
               interfaceId == IERC7579_EXECUTOR_INTERFACE_ID ||
               interfaceId == IERC7579_HOOK_INTERFACE_ID;
    }

    /**
     * @notice Gets the module type for a given ERC-7579 interface ID
     * @param interfaceId The interface ID to check
     * @return moduleType The module type (1-4), or 0 if not a module interface
     */
    function getModuleTypeForInterface(bytes4 interfaceId) internal pure returns (uint256 moduleType) {
        if (interfaceId == IERC7579_VALIDATOR_INTERFACE_ID) return 1;
        if (interfaceId == IERC7579_EXECUTOR_INTERFACE_ID) return 2;
        // Note: Fallback handlers use the base module interface
        if (interfaceId == IERC7579_HOOK_INTERFACE_ID) return 4;
        return 0;
    }
}
