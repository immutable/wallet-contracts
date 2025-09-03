// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../lib/ModeLib.sol";

/// @title MockUnregisteredExecutor
/// @notice Mock executor that is NOT registered as a proper module
/// @dev Used for testing unauthorized access scenarios
contract MockUnregisteredExecutor {
    using ModeLib for ExecutionMode;

    // Events for testing
    event UnauthorizedExecutorCalled(address smartAccount, ExecutionMode mode, bytes executionCalldata);

    /// @notice Attempts to call executeFromExecutor without being a registered module
    /// @param smartAccount The smart account to call
    /// @param mode The execution mode
    /// @param executionCalldata The execution data
    function attemptExecuteOnSmartAccount(
        address smartAccount,
        ExecutionMode mode,
        bytes calldata executionCalldata
    ) external payable returns (bool success, bytes memory returnData) {
        emit UnauthorizedExecutorCalled(smartAccount, mode, executionCalldata);
        
        // Attempt to call executeFromExecutor (should fail)
        (success, returnData) = smartAccount.call{value: msg.value}(
            abi.encodeWithSignature(
                "executeFromExecutor(uint256,bytes)",
                ExecutionMode.unwrap(mode),
                executionCalldata
            )
        );
        
        // Don't revert here - let the test check the success flag
        return (success, returnData);
    }
}
