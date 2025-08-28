// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC7579Validator, PackedUserOperation} from "../../interfaces/erc7579/IERC7579Validator.sol";
import {IERC7579Module} from "../../interfaces/erc7579/IERC7579Module.sol";
import {InterfaceIds} from "../../utils/erc7579/InterfaceIds.sol";
import {ModuleTypeLib} from "../../utils/erc7579/ModuleTypeLib.sol";
import {ModuleAuthFixed, ModuleAuth} from "../commons/ModuleAuthFixed.sol";

/**
 * @title ImmutableValidator
 * @notice ERC-7579 compliant validator module that implements Immutable's signature validation logic
 * @dev Extracts the existing ModuleAuth functionality into a standalone ERC-7579 module
 */
contract ImmutableValidator is IERC7579Validator, ModuleAuthFixed {
    
    /*//////////////////////////////////////////////////////////////////////////
                                STATE MANAGEMENT
    //////////////////////////////////////////////////////////////////////////*/
    
    /// @notice Mapping to track which accounts have this validator installed
    mapping(address => bool) private _installedAccounts;
    
    /// @notice Mapping to store validator configuration per account
    mapping(address => bytes) private _validatorConfig;

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
        // Ensure this validator is installed on the calling account
        require(_installedAccounts[msg.sender], "ImmutableValidator: NOT_INSTALLED");
        
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
        // Mark this account as having the validator installed
        _installedAccounts[msg.sender] = true;
        
        // Store validator configuration if provided
        if (data.length > 0) {
            _validatorConfig[msg.sender] = data;
            // In a full implementation, you might decode and process:
            // - Initial signer addresses
            // - Threshold requirements
            // - Signature schemes
        }
        
        // Module is now installed and ready to validate signatures
    }

    /**
     * @notice Called when the module is uninstalled from a smart account
     * @param data Deinitialization data
     */
    function onUninstall(bytes calldata data) external override {
        // Mark this account as no longer having the validator installed
        _installedAccounts[msg.sender] = false;
        
        // Clear validator configuration
        delete _validatorConfig[msg.sender];
        
        // Note: In production, you might want to preserve some data for audit trails
        // or implement a grace period before full deletion
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
        return _installedAccounts[smartAccount];
    }

    /**
     * @notice Gets validator configuration for an account
     * @param account The account address
     * @return config The validator configuration data
     */
    function getValidatorConfig(address account) external view returns (bytes memory config) {
        require(_installedAccounts[account], "ImmutableValidator: NOT_INSTALLED");
        return _validatorConfig[account];
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
