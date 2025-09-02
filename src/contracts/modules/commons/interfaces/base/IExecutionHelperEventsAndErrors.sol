// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @title Execution Manager Events and Errors Interface
/// @notice Interface for defining events and errors related to transaction execution processes within smart accounts.
/// @dev This interface defines events and errors used by execution manager to handle and report the operational status of smart account transactions.
/// @title Passport Wallet V2 - IExecutionHelperEventsAndErrors Interface
/// @notice Defines events and errors for execution operations
/// @dev It is a part of the Passport Wallet V2 suite of contracts aimed at implementing flexible and secure smart account operations.

/// This file has been adapted from the Nexus suite, which can be found at: https://github.com/rhinestonewtf/nexus/blob/main/contracts/interfaces/base/IExecutionHelperEventsAndErrors.sol

import { ExecType } from "../../../../lib/ModeLib.sol";

interface IExecutionHelperEventsAndErrors {
    /// @notice Event emitted when a transaction fails to execute successfully.
    event TryExecuteUnsuccessful(bytes callData, bytes result);

    /// @notice Event emitted when a transaction fails to execute successfully.
    event TryDelegateCallUnsuccessful(bytes callData, bytes result);

    /// @notice Error thrown when an execution with an unsupported ExecType was made.
    /// @param execType The unsupported execution type.
    error UnsupportedExecType(ExecType execType);
}
