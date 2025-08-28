// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "../../interfaces/erc7579/IERC7579Validator.sol";
import "../../utils/erc7579/InterfaceIds.sol";
import "../../utils/erc7579/ModuleTypeLib.sol";
import "../commons/ModuleAuthFixed.sol";

/**
 * @title ImmutableValidator
 * @notice ERC-7579 compliant validator module that implements Immutable's signature validation logic
 * @dev Extracts the existing ModuleAuth functionality into a standalone ERC-7579 module
 */
contract ImmutableValidator is IERC7579Validator, ModuleAuthFixed {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Constructor for ImmutableValidator
     * @param _factory Address of the wallet factory
     */
    constructor(address _factory) ModuleAuthFixed(_factory) {}

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 VALIDATOR INTERFACE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Validates a user operation signature (ERC-4337 integration)
     * @param userOp The user operation to validate
     * @param userOpHash The hash of the user operation
     * @return validationData Validation result (0 = valid, 1 = invalid)
     */
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash) 
        external 
        override 
        returns (uint256 validationData) 
    {
        // Extract signature from userOp
        bytes calldata signature = userOp.signature;
        
        // Use existing signature validation logic
        bool isValid = _validateSignature(userOpHash, signature);
        
        // Return ERC-4337 validation data format
        // 0 = valid, 1 = invalid
        return isValid ? 0 : 1;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Called when the module is installed on a smart account
     * @param data Initialization data (encoded signer configuration)
     */
    function onInstall(bytes calldata data) external override {
        // Initialize the module with signer configuration
        if (data.length > 0) {
            // Decode initialization data (e.g., initial signers)
            // This would depend on your specific signer management needs
            // For now, we'll keep it simple and use existing logic
        }
        
        // Module is now installed and ready to validate signatures
    }

    /**
     * @notice Called when the module is uninstalled from a smart account
     * @param data Deinitialization data
     */
    function onUninstall(bytes calldata data) external override {
        // Clean up any module-specific storage if needed
        // For this validator, we might want to clear signer data
        
        // Note: Be careful about completely clearing data as it might break
        // backward compatibility with existing wallets
    }

    /**
     * @notice Returns the module type ID
     * @return moduleTypeId The module type ID (1 for validator)
     */
    function moduleType() external pure override returns (uint256) {
        return ModuleTypeLib.TYPE_VALIDATOR;
    }

    /**
     * @notice Checks if the module is initialized for a smart account
     * @param smartAccount The smart account address
     * @return True if the module is initialized
     */
    function isInitialized(address smartAccount) external view returns (bool) {
        // Check if the module has been properly initialized for this account
        // This could check if signers are configured, etc.
        return true; // For now, assume always initialized
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
        override(ModuleAuth, IERC7579Module) 
        returns (bool) 
    {
        return
            interfaceId == InterfaceIds.IERC7579_VALIDATOR_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC7579_MODULE_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC165_INTERFACE_ID ||
            super.supportsInterface(interfaceId);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Internal signature validation using existing ModuleAuthFixed logic
     * @param hash The hash to validate
     * @param signature The signature to check
     * @return True if the signature is valid
     */
    function _validateSignature(bytes32 hash, bytes calldata signature) 
        internal 
        view 
        returns (bool) 
    {
        // Use the existing signature validation logic from ModuleAuthFixed
        // This maintains backward compatibility with current signature schemes
        
        // Use the internal signature validation from ModuleAuthFixed
        return _signatureValidationInternal(hash, signature);
    }
}
