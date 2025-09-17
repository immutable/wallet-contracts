// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../modules/commons/interfaces/modules/IExecutor.sol";
import "../lib/ModeLib.sol";

/// @title MockExecutor
/// @notice Mock executor module for testing MainModuleDynamicAuthV2 integration
/// @dev Simulates a Rhinestone-style executor module that can trigger executeFromExecutor
contract MockExecutor is IExecutor {
    using ModeLib for ExecutionMode;

    mapping(address => bool) private _initialized;
    
    // Events for testing
    event ExecutorCalled(address smartAccount, ExecutionMode mode, bytes executionCalldata);
    event ModuleInstalled(address smartAccount, bytes data);
    event ModuleUninstalled(address smartAccount, bytes data);

    /// @notice Installs the module with necessary initialization data
    function onInstall(bytes calldata data) external override {
        _initialized[msg.sender] = true;
        emit ModuleInstalled(msg.sender, data);
    }

    /// @notice Uninstalls the module and allows for cleanup
    function onUninstall(bytes calldata data) external override {
        _initialized[msg.sender] = false;
        emit ModuleUninstalled(msg.sender, data);
    }

    /// @notice Determines if the module matches the executor module type
    function isModuleType(uint256 moduleTypeId) external pure override returns (bool) {
        return moduleTypeId == 2; // MODULE_TYPE_EXECUTOR
    }

    /// @notice Checks if the module has been initialized for a specific smart account
    function isInitialized(address smartAccount) external view override returns (bool) {
        return _initialized[smartAccount];
    }

    /// @notice Simulates calling executeFromExecutor on a smart account
    /// @param smartAccount The smart account to call
    /// @param mode The execution mode
    /// @param executionCalldata The execution data
    function executeOnSmartAccount(
        address smartAccount,
        ExecutionMode mode,
        bytes calldata executionCalldata
    ) external payable returns (bytes[] memory) {
        emit ExecutorCalled(smartAccount, mode, executionCalldata);
        
        // Call executeFromExecutor on the smart account
        (bool success, bytes memory returnData) = smartAccount.call{value: msg.value}(
            abi.encodeWithSignature(
                "executeFromExecutor(uint256,bytes)",
                ExecutionMode.unwrap(mode),
                executionCalldata
            )
        );
        
        require(success, "MockExecutor: executeFromExecutor failed");
        
        // Decode the return data as bytes[] array
        return abi.decode(returnData, (bytes[]));
    }

    /// @notice Helper function to create single execution calldata
    function createSingleExecutionCalldata(
        address target,
        uint256 value,
        bytes calldata data
    ) external pure returns (bytes memory) {
        return abi.encode(target, value, data);
    }

    /// @notice Helper function to create batch execution calldata
    function createBatchExecutionCalldata(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata data
    ) external pure returns (bytes memory) {
        require(targets.length == values.length && values.length == data.length, "Array length mismatch");
        
        bytes[] memory executions = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            executions[i] = abi.encode(targets[i], values[i], data[i]);
        }
        
        return abi.encode(executions);
    }
}


