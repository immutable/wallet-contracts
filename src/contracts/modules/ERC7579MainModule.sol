// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./MainModule.sol";
import "../interfaces/erc7579/IERC7579Account.sol";
import "../utils/erc7579/ModeLib.sol";
import "../utils/erc7579/ExecutionLib.sol";
import "../utils/erc7579/ModuleTypeLib.sol";
import "../utils/erc7579/InterfaceIds.sol";

/**
 * @title ERC7579MainModule
 * @notice ERC-7579 compliant version of MainModule that extends existing functionality
 * @dev Maintains full backward compatibility while adding ERC-7579 compliance
 * 
 * This contract:
 * - Extends existing MainModule (preserves all current functionality)
 * - Implements IERC7579Account interface (adds ERC-7579 compliance)
 * - Manages external ERC-7579 modules (validators, executors, hooks)
 * - Provides execution mode support (single, batch, delegatecall)
 * - Maps existing components to ERC-7579 module types
 */
contract ERC7579MainModule is MainModule, IERC7579Account {
    using ModeLib for bytes32;
    using ExecutionLib for bytes;
    using ModuleTypeLib for uint256;

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE REGISTRY
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Storage key for external module registry
    bytes32 private constant MODULE_REGISTRY_KEY = keccak256("ERC7579_MODULE_REGISTRY");
    
    /// @notice Mapping of module type => module address => installed status
    /// @dev Uses nested mapping: moduleType => (moduleAddress => isInstalled)
    mapping(uint256 => mapping(address => bool)) private _installedModules;

    /// @notice Mapping of module type => list of installed module addresses
    mapping(uint256 => address[]) private _modulesByType;

    /*//////////////////////////////////////////////////////////////////////////
                                EXECUTION MODES
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Supported execution modes bitmap
    /// @dev Bit positions: 0=single, 1=batch, 2=static, 3=delegatecall
    uint256 private constant SUPPORTED_MODES = 0x0F; // Supports all modes (0b1111)

    /*//////////////////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor for ERC7579MainModule
     * @param _factory Address of the wallet factory
     */
    constructor(address _factory) MainModule(_factory) {
        // Constructor inherits from MainModule
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a transaction on behalf of the account (ERC-7579)
     * @param mode The encoded execution mode
     * @param executionCalldata The encoded execution call data
     * 
     * @dev Converts ERC-7579 format to legacy format and uses existing execution logic
     */
    function execute(bytes32 mode, bytes calldata executionCalldata) 
        external 
        override 
    {
        // Ensure proper authorization (same as existing execute function)
        require(
            msg.sender == address(this) || 
            _isValidExecutor(msg.sender),
            "ERC7579MainModule: UNAUTHORIZED"
        );

        // Validate execution mode is supported
        require(supportsExecutionMode(mode), "ERC7579MainModule: UNSUPPORTED_MODE");

        // Convert ERC-7579 format to legacy Transaction[] format
        IModuleCalls.Transaction[] memory transactions = ExecutionLib.toLegacyTransactions(mode, executionCalldata);

        // Generate a pseudo-nonce for the transaction hash (ERC-7579 doesn't use nonces)
        uint256 pseudoNonce = uint256(keccak256(abi.encode(mode, executionCalldata, block.timestamp)));
        
        // Use existing execution logic from ModuleCalls
        // Note: We bypass signature validation since ERC-7579 handles auth differently
        _executeTransactions(transactions, pseudoNonce);
    }

    /**
     * @notice Executes a transaction on behalf of the account from an executor module
     * @param mode The encoded execution mode
     * @param executionCalldata The encoded execution call data
     * @return returnData Array of return data from executed calls
     */
    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        override
        returns (bytes[] memory returnData)
    {
        // Only installed executor modules can call this
        require(
            this.isModuleInstalled(ModuleTypeLib.TYPE_EXECUTOR, msg.sender, ""),
            "ERC7579MainModule: NOT_EXECUTOR_MODULE"
        );

        // Validate execution mode is supported
        require(supportsExecutionMode(mode), "ERC7579MainModule: UNSUPPORTED_MODE");

        // Convert and execute
        IModuleCalls.Transaction[] memory transactions = ExecutionLib.toLegacyTransactions(mode, executionCalldata);
        
        // Execute and collect return data
        returnData = new bytes[](transactions.length);
        for (uint256 i = 0; i < transactions.length; i++) {
            bool success;
            (success, returnData[i]) = _executeTransaction(transactions[i]);
            
            if (!success && transactions[i].revertOnError) {
                // Revert with the returned error data
                bytes memory errorData = returnData[i];
                if (errorData.length > 0) {
                    assembly { 
                        revert(add(errorData, 0x20), mload(errorData))
                    }
                } else {
                    revert("ERC7579MainModule: EXECUTION_FAILED");
                }
            }
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 CONFIGURATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the account implementation identifier
     * @return accountImplementationId The account ID string
     */
    function accountId() external pure override returns (string memory) {
        return "immutable.wallet.erc7579.v1";
    }

    /**
     * @notice Checks if the account supports a certain execution mode
     * @param encodedMode The encoded execution mode to check
     * @return True if the mode is supported
     */
    function supportsExecutionMode(bytes32 encodedMode) public pure override returns (bool) {
        bytes1 callType = encodedMode.getCallType();
        
        // Support single, batch, static, and delegatecall
        return (
            callType == bytes1(0x00) ||  // SINGLE
            callType == bytes1(0x01) ||  // BATCH
            callType == bytes1(0xfe) ||  // STATIC
            callType == bytes1(0xff)     // DELEGATECALL
        );
    }

    /**
     * @notice Checks if the account supports a certain module type
     * @param moduleTypeId The module type ID to check
     * @return True if the module type is supported
     */
    function supportsModule(uint256 moduleTypeId) external pure override returns (bool) {
        return moduleTypeId.isValidModuleType();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE MANAGEMENT
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Installs a module on the smart account
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @param initData Initialization data for the module
     */
    function installModule(uint256 moduleTypeId, address module, bytes calldata initData) 
        external 
        override 
        onlySelf 
    {
        // Validate module type
        require(moduleTypeId.isValidModuleType(), "ERC7579MainModule: INVALID_MODULE_TYPE");
        
        // Check if module is already installed
        require(!_installedModules[moduleTypeId][module], "ERC7579MainModule: MODULE_ALREADY_INSTALLED");
        
        // Validate module implements correct interface
        require(_validateModuleInterface(moduleTypeId, module), "ERC7579MainModule: INVALID_MODULE_INTERFACE");

        // Install the module
        _installedModules[moduleTypeId][module] = true;
        _modulesByType[moduleTypeId].push(module);

        // Call onInstall on the module
        if (initData.length > 0) {
            (bool success, bytes memory result) = module.call(
                abi.encodeWithSignature("onInstall(bytes)", initData)
            );
            require(success, "ERC7579MainModule: MODULE_INSTALL_FAILED");
        }

        emit ModuleInstalled(moduleTypeId, module);
    }

    /**
     * @notice Uninstalls a module from the smart account
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @param deInitData Deinitialization data for the module
     */
    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) 
        external 
        override 
        onlySelf 
    {
        // Check if module is installed
        require(_installedModules[moduleTypeId][module], "ERC7579MainModule: MODULE_NOT_INSTALLED");
        
        // Cannot uninstall built-in modules
        require(!_isBuiltinModule(moduleTypeId, module), "ERC7579MainModule: CANNOT_UNINSTALL_BUILTIN");

        // Call onUninstall on the module
        if (deInitData.length > 0) {
            (bool success, bytes memory result) = module.call(
                abi.encodeWithSignature("onUninstall(bytes)", deInitData)
            );
            require(success, "ERC7579MainModule: MODULE_UNINSTALL_FAILED");
        }

        // Uninstall the module
        _installedModules[moduleTypeId][module] = false;
        _removeFromModuleList(moduleTypeId, module);

        emit ModuleUninstalled(moduleTypeId, module);
    }

    /**
     * @notice Checks if a module is installed
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @param additionalContext Additional context for the check
     * @return True if the module is installed
     */
    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata additionalContext) 
        external 
        view 
        override 
        returns (bool) 
    {
        // Check built-in modules first
        if (_isBuiltinModule(moduleTypeId, module)) {
            return true;
        }
        
        // Check external modules
        return _installedModules[moduleTypeId][module];
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
        override(MainModule, IERC7579Account) 
        returns (bool) 
    {
        return
            interfaceId == InterfaceIds.IERC7579_ACCOUNT_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC165_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC1271_INTERFACE_ID ||
            super.supportsInterface(interfaceId);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes transactions using custom logic for ERC-7579
     * @param transactions Array of transactions to execute
     * @param pseudoNonce Pseudo-nonce for transaction identification
     */
    function _executeTransactions(IModuleCalls.Transaction[] memory transactions, uint256 pseudoNonce) internal {
        // Generate transaction hash
        bytes32 txHash = _subDigest(keccak256(abi.encode(pseudoNonce, transactions)));
        
        // Execute transactions directly
        for (uint256 i = 0; i < transactions.length; i++) {
            IModuleCalls.Transaction memory transaction = transactions[i];
            
            bool success;
            bytes memory result;
            
            require(gasleft() >= transaction.gasLimit, "ERC7579MainModule: NOT_ENOUGH_GAS");
            
            if (transaction.delegateCall) {
                (success, result) = transaction.target.delegatecall{
                    gas: transaction.gasLimit == 0 ? gasleft() : transaction.gasLimit
                }(transaction.data);
            } else {
                (success, result) = transaction.target.call{
                    value: transaction.value,
                    gas: transaction.gasLimit == 0 ? gasleft() : transaction.gasLimit
                }(transaction.data);
            }
            
            if (success) {
                emit TxExecuted(txHash);
            } else {
                if (transaction.revertOnError) {
                    if (result.length > 0) {
                        assembly { revert(add(result, 0x20), mload(result)) }
                    } else {
                        revert("ERC7579MainModule: EXECUTION_FAILED");
                    }
                } else {
                    emit TxFailed(txHash, result);
                }
            }
        }
    }

    /**
     * @notice Executes a single transaction and returns success/data
     * @param transaction The transaction to execute
     * @return success Whether the transaction succeeded
     * @return returnData The return data from the transaction
     */
    function _executeTransaction(IModuleCalls.Transaction memory transaction) 
        internal 
        returns (bool success, bytes memory returnData) 
    {
        if (transaction.delegateCall) {
            (success, returnData) = transaction.target.delegatecall{
                gas: transaction.gasLimit == 0 ? gasleft() : transaction.gasLimit
            }(transaction.data);
        } else {
            (success, returnData) = transaction.target.call{
                value: transaction.value,
                gas: transaction.gasLimit == 0 ? gasleft() : transaction.gasLimit
            }(transaction.data);
        }
    }

    /**
     * @notice Validates that a module implements the correct interface for its type
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @return True if the module implements the correct interface
     */
    function _validateModuleInterface(uint256 moduleTypeId, address module) internal view returns (bool) {
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
     * @notice Checks if a module is a built-in module
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @return True if it's a built-in module
     */
    function _isBuiltinModule(uint256 moduleTypeId, address module) internal view returns (bool) {
        // Built-in validator: this contract itself (ModuleAuth functionality)
        if (moduleTypeId == ModuleTypeLib.TYPE_VALIDATOR && module == address(this)) {
            return true;
        }
        
        // Built-in fallback handler: this contract itself (ModuleHooks functionality)
        if (moduleTypeId == ModuleTypeLib.TYPE_FALLBACK && module == address(this)) {
            return true;
        }
        
        return false;
    }

    /**
     * @notice Checks if an address is a valid executor
     * @param executor The address to check
     * @return True if it's a valid executor
     */
    function _isValidExecutor(address executor) internal view returns (bool) {
        return _installedModules[ModuleTypeLib.TYPE_EXECUTOR][executor];
    }

    /**
     * @notice Removes a module from the module list
     * @param moduleTypeId The module type ID
     * @param module The module address to remove
     */
    function _removeFromModuleList(uint256 moduleTypeId, address module) internal {
        address[] storage modules = _modulesByType[moduleTypeId];
        for (uint256 i = 0; i < modules.length; i++) {
            if (modules[i] == module) {
                modules[i] = modules[modules.length - 1];
                modules.pop();
                break;
            }
        }
    }
}
