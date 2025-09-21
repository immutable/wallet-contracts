// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {UUPSUpgradeable} from 'solady/utils/UUPSUpgradeable.sol';
import {PackedUserOperation} from 'account-abstraction/interfaces/PackedUserOperation.sol';
import {ExecLib} from './lib/ExecLib.sol';
import {INexus} from './interfaces/INexus.sol';
import {BaseAccount} from './base/BaseAccount.sol';
import {IERC7484} from './interfaces/IERC7484.sol';
import {ModuleManager} from './base/ModuleManager.sol';
import {ExecutionHelper} from './base/ExecutionHelper.sol';
import {IValidator} from './interfaces/modules/IValidator.sol';
import {MODULE_TYPE_VALIDATOR} from './types/Constants.sol';
import {ModeLib, ExecutionMode} from './lib/ModeLib.sol';
import {NonceLib} from './lib/NonceLib.sol';
import {SentinelListLib} from 'sentinellist/SentinelList.sol';
import {Initializable} from './lib/Initializable.sol';
import {ComposableExecutionBase, ComposableExecution} from './lib/ComposableExecutionBase.sol';

/// @title NexusTest - Simplified version of Nexus for testing
abstract contract NexusTest is
  INexus,
  BaseAccount,
  ExecutionHelper,
  ModuleManager,
  UUPSUpgradeable,
  ComposableExecutionBase
{
  using ModeLib for ExecutionMode;
  using ExecLib for bytes;
  using NonceLib for uint256;
  using SentinelListLib for SentinelListLib.SentinelList;

  constructor(
    address anEntryPoint,
    address defaultValidator,
    bytes memory initData
  ) ModuleManager(defaultValidator, initData) {
    require(address(anEntryPoint) != address(0), EntryPointCanNotBeZero());
    _ENTRYPOINT = anEntryPoint;
  }

  function validateUserOp(
    PackedUserOperation calldata op,
    bytes32 /* userOpHash */,
    uint256 missingAccountFunds
  ) external virtual payPrefund(missingAccountFunds) onlyEntryPoint returns (uint256 validationData) {
    address validator = _handleValidator(address(0));
    validationData = IValidator(validator).validateUserOp(op, bytes32(0));
  }

  function execute(
    ExecutionMode /* mode */,
    bytes calldata executionCalldata
  ) external payable onlyEntryPoint withHook {
    // Simplified version: just execute the calldata
    (bool success, ) = address(this).delegatecall(executionCalldata);
    require(success, 'Execution failed');
  }

  function executeFromExecutor(
    ExecutionMode /* mode */,
    bytes calldata executionCalldata
  )
    external
    payable
    onlyExecutorModule
    withHook
    withRegistry(msg.sender, MODULE_TYPE_VALIDATOR)
    returns (bytes[] memory)
  {
    // Simplified version: just execute the calldata
    (bool success, bytes memory result) = address(this).delegatecall(executionCalldata);
    require(success, 'Execution failed');
    bytes[] memory returnData = new bytes[](1);
    returnData[0] = result;
    return returnData;
  }

  function executeUserOp(
    PackedUserOperation calldata userOp,
    bytes32 /* userOpHash */
  ) external payable virtual onlyEntryPoint withHook {
    bytes calldata callData = userOp.callData[4:];
    (bool success, ) = address(this).delegatecall(callData);
    require(success, 'Execution failed');
  }

  function executeComposable(ComposableExecution[] calldata executions) external payable onlyEntryPoint withHook {
    _executeComposable(executions);
  }

  function _executeAction(address to, uint256 value, bytes memory data) internal override returns (bytes memory) {
    return _executeMemory(to, value, data);
  }

  function initializeAccount(bytes calldata initData) external payable virtual {
    if (msg.sender != address(this)) {
      Initializable.requireInitializable();
    }
    _initializeAccount(initData);
  }

  function _initializeAccount(bytes calldata initData) internal {
    require(initData.length >= 24, InvalidInitData());

    address bootstrap;
    bytes calldata bootstrapCall;

    assembly {
      bootstrap := calldataload(initData.offset)
      let s := calldataload(add(initData.offset, 0x20))
      let u := add(initData.offset, s)
      bootstrapCall.offset := add(u, 0x20)
      bootstrapCall.length := calldataload(u)
    }

    (bool success, ) = bootstrap.delegatecall(bootstrapCall);
    require(success, NexusInitializationFailed());
  }

  function setRegistry(IERC7484 newRegistry, address[] calldata attesters, uint8 threshold) external payable {
    require(msg.sender == address(this), AccountAccessUnauthorized());
    _configureRegistry(newRegistry, attesters, threshold);
  }

  function getImplementation() external view returns (address implementation) {
    assembly {
      implementation := sload(_ERC1967_IMPLEMENTATION_SLOT)
    }
    if (implementation == address(0)) {
      assembly {
        implementation := sload(address())
      }
    }
  }

  function supportsModule(uint256 moduleTypeId) external view virtual returns (bool) {
    return moduleTypeId == MODULE_TYPE_VALIDATOR;
  }

  function supportsExecutionMode(ExecutionMode mode) external view virtual returns (bool) {
    return true;
  }

  function isModuleInstalled(
    uint256 moduleTypeId,
    address module,
    bytes calldata additionalContext
  ) external view returns (bool) {
    return _isModuleInstalled(moduleTypeId, module, additionalContext);
  }

  function isInitialized() public view returns (bool) {
    return (IValidator(_DEFAULT_VALIDATOR).isInitialized(address(this)) || _areSentinelListsInitialized());
  }

  function accountId() external pure virtual returns (string memory) {
    return _ACCOUNT_IMPLEMENTATION_ID;
  }

  function upgradeToAndCall(address newImplementation, bytes calldata data) public payable virtual override withHook {
    require(newImplementation != address(0), InvalidImplementationAddress());
    bool res;
    assembly {
      res := gt(extcodesize(newImplementation), 0)
    }
    require(res, InvalidImplementationAddress());
    assembly {
      sstore(address(), newImplementation)
    }
    UUPSUpgradeable.upgradeToAndCall(newImplementation, data);
  }

  function _authorizeUpgrade(
    address /* newImplementation */
  ) internal virtual override(UUPSUpgradeable) onlyEntryPointOrSelf {
    if (_amIERC7702()) {
      revert ERC7702AccountCannotBeUpgradedThisWay();
    }
  }

  function _domainNameAndVersion() internal pure override returns (string memory name, string memory version) {
    name = 'NexusTest';
    version = '1.2.1';
  }
}
