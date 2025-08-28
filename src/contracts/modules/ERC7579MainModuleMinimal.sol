// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {MainModule} from "./MainModule.sol";
import {IERC7579Account} from "../interfaces/erc7579/IERC7579Account.sol";
import {ModeLib} from "../utils/erc7579/ModeLib.sol";
import {ModuleTypeLib} from "../utils/erc7579/ModuleTypeLib.sol";
import {InterfaceIds} from "../utils/erc7579/InterfaceIds.sol";
import {AccountExecutionLib} from "../libraries/ExecutionLib.sol";
import {ExecutionLib} from "../utils/erc7579/ExecutionLib.sol";

/**
 * @title ERC7579MainModuleMinimal
 * @notice Ultra-minimal ERC-7579 compliant smart account for proxy deployment
 * @dev Optimized for size, uses external libraries for complex operations
 */
contract ERC7579MainModuleMinimal is MainModule, IERC7579Account {
    using ModeLib for bytes32;

    /*//////////////////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////////////////*/

    mapping(uint256 => mapping(address => bool)) internal _modules;
    mapping(uint256 => address[]) internal _moduleList;

    /*//////////////////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/

    constructor(address _factory) MainModule(_factory) {
        // Pure modular approach - no modules installed by default
        // Modules will be installed dynamically after deployment
        // This maintains the true spirit of ERC-7579 modularity
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 CORE
    //////////////////////////////////////////////////////////////////////////*/

    function execute(bytes32 mode, bytes calldata executionCalldata) external override {
        require(msg.sender == address(this) || _modules[2][msg.sender], "AUTH");
        require(_supportsMode(mode), "MODE");
        
        // Delegate to AccountExecutionLib for actual execution
        AccountExecutionLib.delegateExecutionWithReturn(mode, executionCalldata);
    }

    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        override
        returns (bytes[] memory returnData)
    {
        // ERC-7579 compliance: Only installed executor modules can call this function
        require(_modules[ModuleTypeLib.TYPE_EXECUTOR][msg.sender], "ERC7579: NOT_EXECUTOR_MODULE");
        
        // Validate execution mode is supported
        require(_supportsMode(mode), "ERC7579: UNSUPPORTED_MODE");
        
        // Delegate to AccountExecutionLib for actual execution
        return AccountExecutionLib.delegateExecutionWithReturn(mode, executionCalldata);
    }

    function accountId() external pure override returns (string memory) {
        return "immutable.erc7579.v1";
    }

    function supportsExecutionMode(bytes32 mode) public pure override returns (bool) {
        return _supportsMode(mode);
    }

    function supportsModule(uint256 moduleTypeId) external pure override returns (bool) {
        return moduleTypeId > 0 && moduleTypeId < 5;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE MANAGEMENT
    //////////////////////////////////////////////////////////////////////////*/

    function installModule(uint256 moduleTypeId, address module, bytes calldata) 
        external 
        override 
        onlySelf 
    {
        require(moduleTypeId > 0 && moduleTypeId < 5, "TYPE");
        require(!_modules[moduleTypeId][module], "EXISTS");
        
        _modules[moduleTypeId][module] = true;
        _moduleList[moduleTypeId].push(module);
        
        emit ModuleInstalled(moduleTypeId, module);
    }

    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata) 
        external 
        override 
        onlySelf 
    {
        require(_modules[moduleTypeId][module], "NOT_FOUND");
        require(!(moduleTypeId == 1 && _moduleList[1].length == 1), "LAST");
        
        _modules[moduleTypeId][module] = false;
        _removeModule(moduleTypeId, module);
        
        emit ModuleUninstalled(moduleTypeId, module);
    }

    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata) 
        external 
        view 
        override 
        returns (bool) 
    {
        return _modules[moduleTypeId][module];
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-165
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
            interfaceId == InterfaceIds.IERC1271_INTERFACE_ID || // ERC-1271 signature validation support
            super.supportsInterface(interfaceId);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////////////////*/

    function _supportsMode(bytes32 mode) internal pure returns (bool) {
        bytes1 callType = mode.getCallType();
        // Support: Single (0x00), Batch (0x01), and DelegateCall (0xff)
        return callType == bytes1(0x00) || callType == bytes1(0x01) || callType == bytes1(0xff);
    }

    function _removeModule(uint256 moduleTypeId, address module) internal {
        address[] storage modules = _moduleList[moduleTypeId];
        for (uint256 i = 0; i < modules.length; i++) {
            if (modules[i] == module) {
                modules[i] = modules[modules.length - 1];
                modules.pop();
                break;
            }
        }
    }
}
