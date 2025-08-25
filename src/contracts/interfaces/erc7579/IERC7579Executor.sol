// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./IERC7579Module.sol";

/**
 * @title IERC7579Executor
 * @notice Interface for ERC-7579 executor modules
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
interface IERC7579Executor is IERC7579Module {
    /*//////////////////////////////////////////////////////////////////////////
                                 EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a transaction through the smart account
     * @param account The smart account to execute the transaction on
     * @param executionData The execution data for the transaction
     * @return returnData The return data from the execution
     * 
     * @dev This function allows the executor module to trigger executions on the account
     * @dev MUST call account.executeFromExecutor() to perform the actual execution
     * @dev MUST implement proper authorization and validation logic
     */
    function executeViaAccount(address account, bytes calldata executionData) 
        external 
        returns (bytes[] memory returnData);

    /**
     * @notice Returns the execution mode that this executor supports
     * @return mode The execution mode bytes32 value
     * 
     * @dev This helps the account determine if the executor is compatible
     */
    function supportedExecutionMode() external view returns (bytes32 mode);
}
