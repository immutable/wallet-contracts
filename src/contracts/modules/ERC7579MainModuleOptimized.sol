// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./MainModule.sol";
import "../interfaces/erc7579/IERC7579Account.sol";
import "../utils/erc7579/ModeLib.sol";
import "../utils/erc7579/ExecutionLib.sol";
import "../utils/erc7579/ModuleTypeLib.sol";
import "../utils/erc7579/InterfaceIds.sol";

/**
 * @title ERC7579MainModuleOptimized
 * @notice Optimized ERC-7579 compliant version of MainModule
 * @dev Maintains backward compatibility while adding ERC-7579 compliance
 */
contract ERC7579MainModuleOptimized is MainModule, IERC7579Account {
    using ModeLib for bytes32;
    using ExecutionLib for bytes;
    using ModuleTypeLib for uint256;

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE REGISTRY
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Mapping of module type => module address => installed status
    mapping(uint256 => mapping(address => bool)) private _installedModules;

    /*//////////////////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/

    constructor(address _factory) MainModule(_factory) {}

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a transaction on behalf of the account (ERC-7579)
     */
    function execute(bytes32 mode, bytes calldata executionCalldata) 
        external 
        override 
    {
        require(
            msg.sender == address(this) || 
            _installedModules[ModuleTypeLib.TYPE_EXECUTOR][msg.sender],
            "ERC7579MainModuleOptimized: UNAUTHORIZED"
        );

        require(supportsExecutionMode(mode), "ERC7579MainModuleOptimized: UNSUPPORTED_MODE");

        // Convert ERC-7579 format to legacy Transaction[] format
        IModuleCalls.Transaction[] memory transactions = ExecutionLib.toLegacyTransactions(mode, executionCalldata);

        // Execute using existing selfExecute function
        this.selfExecute(transactions);
    }

    /**
     * @notice Executes a transaction from an executor module
     */
    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        override
        returns (bytes[] memory returnData)
    {
        require(
            _installedModules[ModuleTypeLib.TYPE_EXECUTOR][msg.sender],
            "ERC7579MainModuleOptimized: NOT_EXECUTOR_MODULE"
        );

        require(supportsExecutionMode(mode), "ERC7579MainModuleOptimized: UNSUPPORTED_MODE");

        // Convert and execute
        IModuleCalls.Transaction[] memory transactions = ExecutionLib.toLegacyTransactions(mode, executionCalldata);
        
        // Execute and collect return data
        returnData = new bytes[](transactions.length);
        for (uint256 i = 0; i < transactions.length; i++) {
            (bool success, bytes memory result) = _executeTransaction(transactions[i]);
            returnData[i] = result;
            
            if (!success && transactions[i].revertOnError) {
                if (result.length > 0) {
                    assembly { revert(add(result, 0x20), mload(result)) }
                } else {
                    revert("ERC7579MainModuleOptimized: EXECUTION_FAILED");
                }
            }
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 CONFIGURATION
    //////////////////////////////////////////////////////////////////////////*/

    function accountId() external pure override returns (string memory) {
        return "immutable.wallet.erc7579.v1";
    }

    function supportsExecutionMode(bytes32 encodedMode) public pure override returns (bool) {
        bytes1 callType = encodedMode.getCallType();
        return (
            callType == bytes1(0x00) ||  // SINGLE
            callType == bytes1(0x01) ||  // BATCH
            callType == bytes1(0xfe) ||  // STATIC
            callType == bytes1(0xff)     // DELEGATECALL
        );
    }

    function supportsModule(uint256 moduleTypeId) external pure override returns (bool) {
        return moduleTypeId.isValidModuleType();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE MANAGEMENT
    //////////////////////////////////////////////////////////////////////////*/

    function installModule(uint256 moduleTypeId, address module, bytes calldata initData) 
        external 
        override 
        onlySelf 
    {
        require(moduleTypeId.isValidModuleType(), "ERC7579MainModuleOptimized: INVALID_MODULE_TYPE");
        require(!_installedModules[moduleTypeId][module], "ERC7579MainModuleOptimized: MODULE_ALREADY_INSTALLED");

        _installedModules[moduleTypeId][module] = true;

        // Call onInstall on the module if initData provided
        if (initData.length > 0) {
            (bool success,) = module.call(abi.encodeWithSignature("onInstall(bytes)", initData));
            require(success, "ERC7579MainModuleOptimized: MODULE_INSTALL_FAILED");
        }

        emit ModuleInstalled(moduleTypeId, module);
    }

    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) 
        external 
        override 
        onlySelf 
    {
        require(_installedModules[moduleTypeId][module], "ERC7579MainModuleOptimized: MODULE_NOT_INSTALLED");
        require(!_isBuiltinModule(moduleTypeId, module), "ERC7579MainModuleOptimized: CANNOT_UNINSTALL_BUILTIN");

        // Call onUninstall on the module if deInitData provided
        if (deInitData.length > 0) {
            (bool success,) = module.call(abi.encodeWithSignature("onUninstall(bytes)", deInitData));
            require(success, "ERC7579MainModuleOptimized: MODULE_UNINSTALL_FAILED");
        }

        _installedModules[moduleTypeId][module] = false;
        emit ModuleUninstalled(moduleTypeId, module);
    }

    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata) 
        external 
        view 
        override 
        returns (bool) 
    {
        // Check built-in modules first
        if (_isBuiltinModule(moduleTypeId, module)) {
            return true;
        }
        
        return _installedModules[moduleTypeId][module];
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-165 SUPPORT
    //////////////////////////////////////////////////////////////////////////*/

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
}
