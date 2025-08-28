// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "../modules/commons/interfaces/IModuleCalls.sol";
import "../utils/erc7579/ModeLib.sol";
import {ExecutionLib as ERC7579ExecutionLib} from "../utils/erc7579/ExecutionLib.sol";

/**
 * @title AccountExecutionLib
 * @notice Library for handling ERC-7579 execution logic
 * @dev Extracts complex execution functions to reduce main contract size
 */
library AccountExecutionLib {
    using ModeLib for bytes32;

    /*//////////////////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////////////////*/

    error ExecutionFailed();
    error NoExecutorInstalled();
    error UnsupportedExecutionMode();

    /*//////////////////////////////////////////////////////////////////////////
                                EXECUTION FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Delegates execution to installed executor modules
     * @param mode The execution mode
     * @param executionCalldata The execution calldata
     * @param executors Array of installed executor modules
     */
    function delegateExecution(
        bytes32 mode, 
        bytes calldata executionCalldata,
        address[] memory executors
    ) external {
        if (executors.length == 0) revert NoExecutorInstalled();

        // Convert ERC-7579 format to legacy format for backward compatibility
        IModuleCalls.Transaction[] memory transactions = ERC7579ExecutionLib.toLegacyTransactions(mode, executionCalldata);
        
        // Delegate to the first executor module
        (bool success,) = executors[0].delegatecall(
            abi.encodeWithSignature(
                "executeLegacyTransactions((bool,bool,uint256,address,uint256,bytes)[],uint256)",
                transactions,
                block.timestamp // Use timestamp as pseudo-nonce
            )
        );
        
        if (!success) revert ExecutionFailed();
    }

    /**
     * @notice Delegates execution and returns data
     * @param mode The execution mode
     * @param executionCalldata The execution calldata
     * @return returnData The return data from execution
     */
    function delegateExecutionWithReturn(
        bytes32 mode, 
        bytes calldata executionCalldata
    ) external returns (bytes[] memory returnData) {
        // Convert and execute through executor module
        IModuleCalls.Transaction[] memory transactions = ERC7579ExecutionLib.toLegacyTransactions(mode, executionCalldata);
        
        returnData = new bytes[](transactions.length);
        for (uint256 i = 0; i < transactions.length; i++) {
            bool success;
            (success, returnData[i]) = transactions[i].target.call{
                value: transactions[i].value,
                gas: transactions[i].gasLimit == 0 ? gasleft() : transactions[i].gasLimit
            }(transactions[i].data);
            
            if (!success && transactions[i].revertOnError) {
                bytes memory errorData = returnData[i];
                if (errorData.length > 0) {
                    assembly { revert(add(errorData, 0x20), mload(errorData)) }
                } else {
                    revert ExecutionFailed();
                }
            }
        }
    }

    /**
     * @notice Executes a single transaction
     * @param target The target contract address
     * @param value The value to send
     * @param data The call data
     * @param gasLimit The gas limit (0 for all remaining gas)
     * @param revertOnError Whether to revert on error
     * @return success Whether the call succeeded
     * @return returnData The return data from the call
     */
    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 gasLimit,
        bool revertOnError
    ) external returns (bool success, bytes memory returnData) {
        (success, returnData) = target.call{
            value: value,
            gas: gasLimit == 0 ? gasleft() : gasLimit
        }(data);
        
        if (!success && revertOnError) {
            if (returnData.length > 0) {
                assembly { revert(add(returnData, 0x20), mload(returnData)) }
            } else {
                revert ExecutionFailed();
            }
        }
    }

    /**
     * @notice Executes multiple transactions in batch
     * @param transactions Array of transactions to execute
     * @return returnData Array of return data from each transaction
     */
    function executeBatch(
        IModuleCalls.Transaction[] memory transactions
    ) external returns (bytes[] memory returnData) {
        returnData = new bytes[](transactions.length);
        
        for (uint256 i = 0; i < transactions.length; i++) {
            IModuleCalls.Transaction memory txn = transactions[i];
            bool success;
            
            if (txn.delegateCall) {
                (success, returnData[i]) = txn.target.delegatecall{
                    gas: txn.gasLimit == 0 ? gasleft() : txn.gasLimit
                }(txn.data);
            } else {
                (success, returnData[i]) = txn.target.call{
                    value: txn.value,
                    gas: txn.gasLimit == 0 ? gasleft() : txn.gasLimit
                }(txn.data);
            }
            
            if (!success && txn.revertOnError) {
                bytes memory errorData = returnData[i];
                if (errorData.length > 0) {
                    assembly { revert(add(errorData, 0x20), mload(errorData)) }
                } else {
                    revert ExecutionFailed();
                }
            }
        }
    }
}
