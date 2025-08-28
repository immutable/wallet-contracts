// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./MainModule.sol";
import "../interfaces/erc7579/IERC7579Account.sol";
import "../utils/erc7579/ModeLib.sol";
import "../utils/erc7579/ModuleTypeLib.sol";
import "../utils/erc7579/InterfaceIds.sol";

// Import libraries
import "../libraries/ExecutionLib.sol";
import "../libraries/ModuleManagementLib.sol";
import "../libraries/HookLib.sol";

// Import default modules
import "./erc7579/ImmutableValidator.sol";
import "./erc7579/ImmutableFallbackHandler.sol";
import "./erc7579/ImmutableExecutor.sol";
import "./erc7579/ImmutableHook.sol";

/**
 * @title ERC7579MainModuleOptimized
 * @notice Size-optimized ERC-7579 compliant smart account using libraries
 * @dev Uses libraries to reduce contract size while maintaining full functionality
 */
contract ERC7579MainModuleOptimized is MainModule, IERC7579Account {
    using ModeLib for bytes32;
    using ModuleTypeLib for uint256;

    /*//////////////////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////////////////*/
    
    event DefaultModulesInstalled(address validator, address executor, address fallbackHandler, address hook);

    /*//////////////////////////////////////////////////////////////////////////
                                STORAGE
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

    constructor(address _factory) MainModule(_factory) {
        // Deploy default modules
        DEFAULT_VALIDATOR = address(new ImmutableValidator(_factory));
        DEFAULT_EXECUTOR = address(new ImmutableExecutor(_factory));
        DEFAULT_FALLBACK_HANDLER = address(new ImmutableFallbackHandler(_factory));
        DEFAULT_HOOK = address(new ImmutableHook());

        // Install default modules
        _installDefaults();
        
        emit DefaultModulesInstalled(DEFAULT_VALIDATOR, DEFAULT_EXECUTOR, DEFAULT_FALLBACK_HANDLER, DEFAULT_HOOK);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    function execute(bytes32 mode, bytes calldata executionCalldata) external override {
        require(
            msg.sender == address(this) || 
            _installedModules[ModuleTypeLib.TYPE_EXECUTOR][msg.sender],
            "ERR_UNAUTHORIZED"
        );

        require(supportsExecutionMode(mode), "ERR_UNSUPPORTED_MODE");

        // Call hooks and execute
        bytes memory hookData = HookLib.callPreHooks(_modulesByType[ModuleTypeLib.TYPE_HOOK], msg.sender, 0, executionCalldata);
        AccountExecutionLib.delegateExecution(mode, executionCalldata, _modulesByType[ModuleTypeLib.TYPE_EXECUTOR]);
        HookLib.callPostHooks(_modulesByType[ModuleTypeLib.TYPE_HOOK], hookData);
    }

    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        override
        returns (bytes[] memory returnData)
    {
        require(_installedModules[ModuleTypeLib.TYPE_EXECUTOR][msg.sender], "ERR_NOT_EXECUTOR");
        require(supportsExecutionMode(mode), "ERR_UNSUPPORTED_MODE");

        bytes memory hookData = HookLib.callPreHooks(_modulesByType[ModuleTypeLib.TYPE_HOOK], msg.sender, 0, executionCalldata);
        returnData = AccountExecutionLib.delegateExecutionWithReturn(mode, executionCalldata);
        HookLib.callPostHooks(_modulesByType[ModuleTypeLib.TYPE_HOOK], hookData);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 CONFIGURATION
    //////////////////////////////////////////////////////////////////////////*/

    function accountId() external pure override returns (string memory) {
        return "immutable.wallet.erc7579.optimized.v1";
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
        ModuleManagementLib.installModuleWithValidation(_installedModules, _modulesByType, moduleTypeId, module, initData);
    }

    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) 
        external 
        override 
        onlySelf 
    {
        ModuleManagementLib.uninstallModuleWithValidation(_installedModules, _modulesByType, moduleTypeId, module, deInitData);
    }

    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata) 
        external 
        view 
        override 
        returns (bool) 
    {
        return _installedModules[moduleTypeId][module];
    }

    function getInstalledModules(uint256 moduleTypeId) external view returns (address[] memory) {
        return _modulesByType[moduleTypeId];
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

    function _installDefaults() internal {
        _installedModules[ModuleTypeLib.TYPE_VALIDATOR][DEFAULT_VALIDATOR] = true;
        _modulesByType[ModuleTypeLib.TYPE_VALIDATOR].push(DEFAULT_VALIDATOR);

        _installedModules[ModuleTypeLib.TYPE_EXECUTOR][DEFAULT_EXECUTOR] = true;
        _modulesByType[ModuleTypeLib.TYPE_EXECUTOR].push(DEFAULT_EXECUTOR);

        _installedModules[ModuleTypeLib.TYPE_FALLBACK][DEFAULT_FALLBACK_HANDLER] = true;
        _modulesByType[ModuleTypeLib.TYPE_FALLBACK].push(DEFAULT_FALLBACK_HANDLER);

        _installedModules[ModuleTypeLib.TYPE_HOOK][DEFAULT_HOOK] = true;
        _modulesByType[ModuleTypeLib.TYPE_HOOK].push(DEFAULT_HOOK);
    }
}