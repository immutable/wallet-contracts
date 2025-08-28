// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ModeLib} from "./ModeLib.sol";
import {IModuleCalls} from "../../modules/commons/interfaces/IModuleCalls.sol";

/**
 * @title ExecutionLib  
 * @notice Library for encoding and decoding ERC-7579 execution calldata
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
library ExecutionLib {
    /*//////////////////////////////////////////////////////////////////////////
                                  STRUCTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Single execution struct
    struct Execution {
        address target;
        uint256 value;
        bytes data;
    }

    /// @notice Delegate call execution struct (no value)
    struct DelegateExecution {
        address target;
        bytes data;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                 ENCODING
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Encodes a single execution
     * @param target The target address
     * @param value The value to send
     * @param data The call data
     * @return executionCalldata The encoded execution calldata
     */
    function encodeSingle(address target, uint256 value, bytes memory data) 
        internal 
        pure 
        returns (bytes memory executionCalldata) 
    {
        return abi.encodePacked(target, value, data);
    }

    /**
     * @notice Encodes a batch of executions
     * @param executions Array of executions to encode
     * @return executionCalldata The encoded execution calldata
     */
    function encodeBatch(Execution[] memory executions) 
        internal 
        pure 
        returns (bytes memory executionCalldata) 
    {
        return abi.encode(executions);
    }

    /**
     * @notice Encodes a delegate call execution
     * @param target The target address
     * @param data The call data
     * @return executionCalldata The encoded execution calldata
     */
    function encodeDelegateCall(address target, bytes memory data) 
        internal 
        pure 
        returns (bytes memory executionCalldata) 
    {
        return abi.encodePacked(target, data);
    }

    /**
     * @notice Encodes a batch of delegate call executions
     * @param executions Array of delegate executions to encode
     * @return executionCalldata The encoded execution calldata
     */
    function encodeDelegateCallBatch(DelegateExecution[] memory executions) 
        internal 
        pure 
        returns (bytes memory executionCalldata) 
    {
        return abi.encode(executions);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                 DECODING
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Decodes a single execution from calldata
     * @param executionCalldata The encoded execution calldata
     * @return target The target address
     * @return value The value to send
     * @return data The call data
     */
    function decodeSingle(bytes calldata executionCalldata) 
        internal 
        pure 
        returns (address target, uint256 value, bytes calldata data) 
    {
        require(executionCalldata.length >= 52, "ExecutionLib: invalid single execution data");
        
        target = address(bytes20(executionCalldata[0:20]));
        value = uint256(bytes32(executionCalldata[20:52]));
        data = executionCalldata[52:];
    }

    /**
     * @notice Decodes a batch execution from calldata
     * @param executionCalldata The encoded execution calldata
     * @return executions Array of decoded executions
     */
    function decodeBatch(bytes calldata executionCalldata) 
        internal 
        pure 
        returns (Execution[] memory executions) 
    {
        return abi.decode(executionCalldata, (Execution[]));
    }

    /**
     * @notice Decodes a delegate call execution from calldata
     * @param executionCalldata The encoded execution calldata
     * @return target The target address
     * @return data The call data
     */
    function decodeDelegateCall(bytes calldata executionCalldata) 
        internal 
        pure 
        returns (address target, bytes calldata data) 
    {
        require(executionCalldata.length >= 20, "ExecutionLib: invalid delegate call data");
        
        target = address(bytes20(executionCalldata[0:20]));
        data = executionCalldata[20:];
    }

    /**
     * @notice Decodes a batch delegate call execution from calldata
     * @param executionCalldata The encoded execution calldata
     * @return executions Array of decoded delegate executions
     */
    function decodeDelegateCallBatch(bytes calldata executionCalldata) 
        internal 
        pure 
        returns (DelegateExecution[] memory executions) 
    {
        return abi.decode(executionCalldata, (DelegateExecution[]));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                CONVERSION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Converts ERC-7579 execution to legacy IModuleCalls.Transaction format
     * @param mode The execution mode
     * @param executionCalldata The execution calldata
     * @return transactions Array of legacy IModuleCalls.Transaction structs
     */
    function toLegacyTransactions(bytes32 mode, bytes calldata executionCalldata) 
        internal 
        pure 
        returns (IModuleCalls.Transaction[] memory transactions) 
    {
        if (ModeLib.isSingleCall(mode)) {
            (address target, uint256 value, bytes calldata data) = decodeSingle(executionCalldata);
            
            transactions = new IModuleCalls.Transaction[](1);
            transactions[0] = IModuleCalls.Transaction({
                target: target,
                value: value,
                data: data,
                delegateCall: false,
                gasLimit: 0, // No gas limit specified
                revertOnError: !ModeLib.isTryExecution(mode)
            });
        } else if (ModeLib.isBatchCall(mode)) {
            Execution[] memory executions = decodeBatch(executionCalldata);
            
            transactions = new IModuleCalls.Transaction[](executions.length);
            for (uint256 i = 0; i < executions.length; i++) {
                transactions[i] = IModuleCalls.Transaction({
                    target: executions[i].target,
                    value: executions[i].value,
                    data: executions[i].data,
                    delegateCall: false,
                    gasLimit: 0,
                    revertOnError: !ModeLib.isTryExecution(mode)
                });
            }
        } else if (ModeLib.isDelegateCall(mode)) {
            (address target, bytes calldata data) = decodeDelegateCall(executionCalldata);
            
            transactions = new IModuleCalls.Transaction[](1);
            transactions[0] = IModuleCalls.Transaction({
                target: target,
                value: 0,
                data: data,
                delegateCall: true,
                gasLimit: 0,
                revertOnError: !ModeLib.isTryExecution(mode)
            });
        } else {
            revert("ExecutionLib: unsupported execution mode");
        }
    }

    /**
     * @notice Converts legacy IModuleCalls.Transaction array to ERC-7579 format
     * @param transactions Array of legacy IModuleCalls.Transaction structs
     * @return mode The execution mode
     * @return executionCalldata The execution calldata
     */
    function fromLegacyTransactions(IModuleCalls.Transaction[] memory transactions) 
        internal 
        pure 
        returns (bytes32 mode, bytes memory executionCalldata) 
    {
        require(transactions.length > 0, "ExecutionLib: empty transactions");
        
        bool isDelegateCall = transactions[0].delegateCall;
        bool isTryExec = !transactions[0].revertOnError;
        
        // Validate all transactions have same type
        for (uint256 i = 1; i < transactions.length; i++) {
            require(
                transactions[i].delegateCall == isDelegateCall,
                "ExecutionLib: mixed call types not supported"
            );
            require(
                transactions[i].revertOnError == transactions[0].revertOnError,
                "ExecutionLib: mixed execution types not supported"
            );
        }
        
        if (transactions.length == 1) {
            // Single execution
            if (isDelegateCall) {
                mode = ModeLib.encodeSimpleMode(
                    bytes1(0xff), // DELEGATECALL
                    isTryExec ? bytes1(0x01) : bytes1(0x00)
                );
                executionCalldata = encodeDelegateCall(transactions[0].target, transactions[0].data);
            } else {
                mode = ModeLib.encodeSimpleMode(
                    bytes1(0x00), // SINGLE
                    isTryExec ? bytes1(0x01) : bytes1(0x00)
                );
                executionCalldata = encodeSingle(
                    transactions[0].target,
                    transactions[0].value,
                    transactions[0].data
                );
            }
        } else {
            // Batch execution
            mode = ModeLib.encodeSimpleMode(
                bytes1(0x01), // BATCH
                isTryExec ? bytes1(0x01) : bytes1(0x00)
            );
            
            if (isDelegateCall) {
                DelegateExecution[] memory delegateExecs = new DelegateExecution[](transactions.length);
                for (uint256 i = 0; i < transactions.length; i++) {
                    delegateExecs[i] = DelegateExecution({
                        target: transactions[i].target,
                        data: transactions[i].data
                    });
                }
                executionCalldata = encodeDelegateCallBatch(delegateExecs);
            } else {
                Execution[] memory executions = new Execution[](transactions.length);
                for (uint256 i = 0; i < transactions.length; i++) {
                    executions[i] = Execution({
                        target: transactions[i].target,
                        value: transactions[i].value,
                        data: transactions[i].data
                    });
                }
                executionCalldata = encodeBatch(executions);
            }
        }
    }
}
