// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { ExecutionMode } from "../../../../lib/ModeLib.sol";

import { IExecutionHelperEventsAndErrors } from "./IExecutionHelperEventsAndErrors.sol";

/// @title Passport Wallet V2 - IExecutionHelper Interface
/// @notice Interface for executing transactions on behalf of smart accounts within the Passport Wallet V2 Smart Account framework, compliant with the ERC-7579 standard.
/// @dev Extends functionality for transaction execution with error handling as defined in IExecutionHelperEventsAndErrors.
/// This interface is future-proof, allowing for expansion and integration of advanced features in subsequent versions.

/// This file has been adapted from the Nexus suite, which can be found at: https://github.com/rhinestonewtf/nexus/blob/main/contracts/interfaces/base/IExecutionHelper.sol
interface IExecutionHelper is IExecutionHelperEventsAndErrors {
    /// @notice Executes a transaction with specified execution mode and calldata.
    /// @param mode The execution mode, defining how the transaction is processed.
    /// @param executionCalldata The calldata to execute.
    /// @dev This function ensures that the execution complies with smart account execution policies and handles errors appropriately.
    function execute(ExecutionMode mode, bytes calldata executionCalldata) external payable;

    /// @notice Allows an executor module to perform transactions on behalf of the account.
    /// @param mode The execution mode that details how the transaction should be handled.
    /// @param executionCalldata The transaction data to be executed.
    /// @return returnData The result of the execution, allowing for error handling and results interpretation by the executor module.
    function executeFromExecutor(ExecutionMode mode, bytes calldata executionCalldata) external payable returns (bytes[] memory returnData);
}
