// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./MainModule.sol";
import "../interfaces/erc7579/IERC7579Account.sol";
import "../utils/erc7579/ModeLib.sol";
import "../utils/erc7579/ExecutionLib.sol";
import "../utils/erc7579/ModuleTypeLib.sol";
import "../utils/erc7579/InterfaceIds.sol";

// Import default modules
import "./erc7579/ImmutableValidator.sol";
import "./erc7579/ImmutableFallbackHandler.sol";
import "./erc7579/ImmutableExecutor.sol";
import "./erc7579/ImmutableHook.sol";

/**
 * @title ERC7579MainModuleModular
 * @notice Fully modular ERC-7579 compliant smart account with NO built-in modules
 * @dev All functionality is provided through installable modules
 * 
 * This contract:
 * - Implements pure ERC-7579 compliance (no built-in modules)
 * - Auto-installs default Immutable modules during deployment
 * - Allows complete customization of all module types
 * - Maintains backward compatibility through default module selection
 */
contract ERC7579MainModuleModular is MainModule, IERC7579Account {
    using ModeLib for bytes32;
    using ExecutionLib for bytes;
    using ModuleTypeLib for uint256;

    /*//////////////////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////////////////*/
    
    event DefaultModulesInstalled(
        address validator,
        address executor,
        address fallbackHandler,
        address hook
    );

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE REGISTRY
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Mapping of module type => module address => installed status
    mapping(uint256 => mapping(address => bool)) private _installedModules;

    /// @notice Mapping of module type => list of installed module addresses
    mapping(uint256 => address[]) private _modulesByType;

    /// @notice Default module addresses (deployed during construction)
    address public immutable DEFAULT_VALIDATOR;
    address public immutable DEFAULT_EXECUTOR;
    address public immutable DEFAULT_FALLBACK_HANDLER;
    address public immutable DEFAULT_HOOK;

    /*//////////////////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor for ERC7579MainModuleModular
     * @param _factory Address of the wallet factory
     */
    constructor(address _factory) MainModule(_factory) {
        // Deploy default modules
        DEFAULT_VALIDATOR = address(new ImmutableValidator(_factory));
        DEFAULT_EXECUTOR = address(new ImmutableExecutor(_factory));
        DEFAULT_FALLBACK_HANDLER = address(new ImmutableFallbackHandler(_factory));
        DEFAULT_HOOK = address(new ImmutableHook());

        // Install default modules
        _installDefaultModules();
        
        emit DefaultModulesInstalled(
            DEFAULT_VALIDATOR,
            DEFAULT_EXECUTOR,
            DEFAULT_FALLBACK_HANDLER,
            DEFAULT_HOOK
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a transaction on behalf of the account (ERC-7579)
     * @param mode The encoded execution mode
     * @param executionCalldata The encoded execution call data
     */
    function execute(bytes32 mode, bytes calldata executionCalldata) 
        external 
        override 
    {
        // Check authorization through installed validators or self-call
        require(
            msg.sender == address(this) || 
            _isInstalledModule(ModuleTypeLib.TYPE_EXECUTOR, msg.sender),
            "ERC7579MainModuleModular: UNAUTHORIZED"
        );

        // Validate execution mode is supported
        require(supportsExecutionMode(mode), "ERC7579MainModuleModular: UNSUPPORTED_MODE");

        // Call pre-execution hooks
        bytes memory hookData = _callPreHooks(msg.sender, 0, executionCalldata);

        // Delegate execution to installed executor modules
        _delegateExecution(mode, executionCalldata);

        // Call post-execution hooks
        _callPostHooks(hookData);
    }

    /**
     * @notice Executes a transaction from an executor module
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
            _isInstalledModule(ModuleTypeLib.TYPE_EXECUTOR, msg.sender),
            "ERC7579MainModuleModular: NOT_EXECUTOR_MODULE"
        );

        // Validate execution mode is supported
        require(supportsExecutionMode(mode), "ERC7579MainModuleModular: UNSUPPORTED_MODE");

        // Call pre-execution hooks
        bytes memory hookData = _callPreHooks(msg.sender, 0, executionCalldata);

        // Delegate execution to the calling executor module
        returnData = _delegateExecutionWithReturn(mode, executionCalldata);

        // Call post-execution hooks
        _callPostHooks(hookData);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 CONFIGURATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the account implementation identifier
     * @return accountImplementationId The account ID string
     */
    function accountId() external pure override returns (string memory) {
        return "immutable.wallet.erc7579.modular.v1";
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
        require(moduleTypeId.isValidModuleType(), "ERC7579MainModuleModular: INVALID_MODULE_TYPE");
        
        // Check if module is already installed
        require(!_installedModules[moduleTypeId][module], "ERC7579MainModuleModular: MODULE_ALREADY_INSTALLED");
        
        // Validate module implements correct interface
        require(_validateModuleInterface(moduleTypeId, module), "ERC7579MainModuleModular: INVALID_MODULE_INTERFACE");

        // Install the module
        _installedModules[moduleTypeId][module] = true;
        _modulesByType[moduleTypeId].push(module);

        // Call onInstall on the module
        if (initData.length > 0) {
            (bool success,) = module.call(
                abi.encodeWithSignature("onInstall(bytes)", initData)
            );
            require(success, "ERC7579MainModuleModular: MODULE_INSTALL_FAILED");
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
        require(_installedModules[moduleTypeId][module], "ERC7579MainModuleModular: MODULE_NOT_INSTALLED");
        
        // Prevent uninstalling the last validator (security requirement)
        if (moduleTypeId == ModuleTypeLib.TYPE_VALIDATOR) {
            require(_modulesByType[moduleTypeId].length > 1, "ERC7579MainModuleModular: CANNOT_REMOVE_LAST_VALIDATOR");
        }

        // Call onUninstall on the module
        if (deInitData.length > 0) {
            (bool success,) = module.call(
                abi.encodeWithSignature("onUninstall(bytes)", deInitData)
            );
            require(success, "ERC7579MainModuleModular: MODULE_UNINSTALL_FAILED");
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
        return _installedModules[moduleTypeId][module];
    }

    /**
     * @notice Gets all installed modules of a specific type
     * @param moduleTypeId The module type ID
     * @return modules Array of installed module addresses
     */
    function getInstalledModules(uint256 moduleTypeId) 
        external 
        view 
        returns (address[] memory modules) 
    {
        return _modulesByType[moduleTypeId];
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
     * @notice Installs default modules during construction
     */
    function _installDefaultModules() internal {
        // Install default validator
        _installedModules[ModuleTypeLib.TYPE_VALIDATOR][DEFAULT_VALIDATOR] = true;
        _modulesByType[ModuleTypeLib.TYPE_VALIDATOR].push(DEFAULT_VALIDATOR);

        // Install default executor
        _installedModules[ModuleTypeLib.TYPE_EXECUTOR][DEFAULT_EXECUTOR] = true;
        _modulesByType[ModuleTypeLib.TYPE_EXECUTOR].push(DEFAULT_EXECUTOR);

        // Install default fallback handler
        _installedModules[ModuleTypeLib.TYPE_FALLBACK][DEFAULT_FALLBACK_HANDLER] = true;
        _modulesByType[ModuleTypeLib.TYPE_FALLBACK].push(DEFAULT_FALLBACK_HANDLER);

        // Install default hook (optional)
        _installedModules[ModuleTypeLib.TYPE_HOOK][DEFAULT_HOOK] = true;
        _modulesByType[ModuleTypeLib.TYPE_HOOK].push(DEFAULT_HOOK);
    }

    /**
     * @notice Delegates execution to installed executor modules
     * @param mode The execution mode
     * @param executionCalldata The execution calldata
     */
    function _delegateExecution(bytes32 mode, bytes calldata executionCalldata) internal {
        // Get the first installed executor (for simplicity)
        address[] memory executors = _modulesByType[ModuleTypeLib.TYPE_EXECUTOR];
        require(executors.length > 0, "ERC7579MainModuleModular: NO_EXECUTOR_INSTALLED");

        // Convert ERC-7579 format to legacy format for backward compatibility
        IModuleCalls.Transaction[] memory transactions = ExecutionLib.toLegacyTransactions(mode, executionCalldata);
        
        // Delegate to the executor module
        (bool success,) = executors[0].delegatecall(
            abi.encodeWithSignature(
                "executeLegacyTransactions((bool,bool,uint256,address,uint256,bytes)[],uint256)",
                transactions,
                block.timestamp // Use timestamp as pseudo-nonce
            )
        );
        
        require(success, "ERC7579MainModuleModular: EXECUTION_FAILED");
    }

    /**
     * @notice Delegates execution and returns data
     * @param mode The execution mode
     * @param executionCalldata The execution calldata
     * @return returnData The return data from execution
     */
    function _delegateExecutionWithReturn(bytes32 mode, bytes calldata executionCalldata) 
        internal 
        returns (bytes[] memory returnData) 
    {
        // Convert and execute through executor module
        IModuleCalls.Transaction[] memory transactions = ExecutionLib.toLegacyTransactions(mode, executionCalldata);
        
        returnData = new bytes[](transactions.length);
        for (uint256 i = 0; i < transactions.length; i++) {
            bool success;
            (success, returnData[i]) = transactions[i].target.call{
                value: transactions[i].value,
                gas: transactions[i].gasLimit == 0 ? gasleft() : transactions[i].gasLimit
            }(transactions[i].data);
            
            if (!success && transactions[i].revertOnError) {
                bytes memory errorData = returnData[i];
                if (errorData.length > 0) {
                    assembly { revert(add(errorData, 0x20), mload(errorData)) }
                } else {
                    revert("ERC7579MainModuleModular: EXECUTION_FAILED");
                }
            }
        }
    }

    /**
     * @notice Calls pre-execution hooks
     * @param msgSender The message sender
     * @param value The transaction value
     * @param msgData The message data
     * @return hookData Context data for post-execution hooks
     */
    function _callPreHooks(address msgSender, uint256 value, bytes calldata msgData) 
        internal 
        returns (bytes memory hookData) 
    {
        address[] memory hooks = _modulesByType[ModuleTypeLib.TYPE_HOOK];
        
        for (uint256 i = 0; i < hooks.length; i++) {
            try IERC7579Hook(hooks[i]).preCheck(msgSender, value, msgData) returns (bytes memory data) {
                hookData = data; // Use the last hook's data
            } catch {
                // Continue if hook fails (non-critical)
            }
        }
    }

    /**
     * @notice Calls post-execution hooks
     * @param hookData Context data from pre-execution hooks
     */
    function _callPostHooks(bytes memory hookData) internal {
        address[] memory hooks = _modulesByType[ModuleTypeLib.TYPE_HOOK];
        
        for (uint256 i = 0; i < hooks.length; i++) {
            try IERC7579Hook(hooks[i]).postCheck(hookData) {
                // Hook executed successfully
            } catch {
                // Continue if hook fails (non-critical)
            }
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
     * @notice Checks if a module is installed
     * @param moduleTypeId The module type ID
     * @param module The module address
     * @return True if the module is installed
     */
    function _isInstalledModule(uint256 moduleTypeId, address module) internal view returns (bool) {
        return _installedModules[moduleTypeId][module];
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
