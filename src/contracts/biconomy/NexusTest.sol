// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {UUPSUpgradeable} from 'solady/utils/UUPSUpgradeable.sol';
import {PackedUserOperation} from 'account-abstraction/interfaces/PackedUserOperation.sol';
import {INexus} from './interfaces/INexus.sol';
import {BaseAccount} from './base/BaseAccount.sol';
import {ModuleManager} from './base/ModuleManager.sol';
import {ExecutionHelper} from './base/ExecutionHelper.sol';
import {IValidator} from './interfaces/modules/IValidator.sol';
import {MODULE_TYPE_VALIDATOR, MODULE_TYPE_EXECUTOR} from './types/Constants.sol';
import {ModeLib, ExecutionMode} from './lib/ModeLib.sol';
import {NonceLib} from './lib/NonceLib.sol';
import {SentinelListLib} from 'sentinellist/SentinelList.sol';
import {Initializable} from './lib/Initializable.sol';

/// @title NexusTest - Simplified version of Nexus for testing
/// @notice This is a test-only version with reduced functionality to keep contract size under limits
abstract contract NexusTest is INexus, BaseAccount, ExecutionHelper, ModuleManager, UUPSUpgradeable {
  using ModeLib for ExecutionMode;
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
    withRegistry(msg.sender, MODULE_TYPE_EXECUTOR)
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

  function initializeAccount(bytes calldata initData) external payable virtual {
    if (msg.sender != address(this)) {
      Initializable.requireInitializable();
    }
    // Simplified initialization for testing
    (bool success, ) = address(this).delegatecall(initData);
    require(success, 'Initialization failed');
  }

  function isInitialized() public view returns (bool) {
    return (IValidator(_DEFAULT_VALIDATOR).isInitialized(address(this)) || _areSentinelListsInitialized());
  }

  function accountId() external pure virtual returns (string memory) {
    return 'NexusTest v1.0';
  }

  function _authorizeUpgrade(address /* newImplementation */) internal virtual override onlyEntryPointOrSelf {}

  function supportsExecutionMode(ExecutionMode /* mode */) external view virtual returns (bool) {
    return true; // Simplified for testing
  }

  function _domainNameAndVersion() internal pure override returns (string memory name, string memory version) {
    name = 'NexusTest';
    version = '1.0.0';
  }

  // Required interface implementations
  function installModule(
    uint256 moduleTypeId,
    address module,
    bytes calldata initData
  ) external payable virtual override;

  function uninstallModule(
    uint256 moduleTypeId,
    address module,
    bytes calldata deInitData
  ) external payable virtual override;

  function isModuleInstalled(
    uint256 moduleTypeId,
    address module,
    bytes calldata additionalContext
  ) external view virtual override returns (bool);

  function isValidSignature(bytes32 hash, bytes calldata data) external view virtual override returns (bytes4);

  function supportsModule(uint256 moduleTypeId) external view virtual override returns (bool);
}
