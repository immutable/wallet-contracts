// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

/**
 * @title ModeLib
 * @notice Library for encoding and decoding ERC-7579 execution modes
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
library ModeLib {
    /*//////////////////////////////////////////////////////////////////////////
                                 CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/

    // Call Types (1 byte)
    bytes32 internal constant CALLTYPE_SINGLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant CALLTYPE_BATCH = 0x0100000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant CALLTYPE_STATIC = 0xfe00000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant CALLTYPE_DELEGATECALL = 0xff00000000000000000000000000000000000000000000000000000000000000;

    // Execution Types (1 byte)  
    bytes32 internal constant EXECTYPE_DEFAULT = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant EXECTYPE_TRY = 0x0001000000000000000000000000000000000000000000000000000000000000;

    // Masks for extracting components
    bytes32 internal constant CALLTYPE_MASK = 0xff00000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant EXECTYPE_MASK = 0x00ff000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant MODE_SELECTOR_MASK = 0x00000000ffffffff000000000000000000000000000000000000000000000000;
    bytes32 internal constant MODE_PAYLOAD_MASK = 0x00000000000000000000ffffffffffffffffffffffffffffffffffffffffffff;

    /*//////////////////////////////////////////////////////////////////////////
                                 ENCODING
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Encodes execution mode from components
     * @param callType The call type (single, batch, static, delegatecall)
     * @param execType The execution type (default, try)
     * @param modeSelector Additional mode selector (4 bytes)
     * @param modePayload Additional mode payload (22 bytes)
     * @return mode The encoded execution mode
     */
    function encodeMode(
        bytes1 callType,
        bytes1 execType,
        bytes4 modeSelector,
        bytes22 modePayload
    ) internal pure returns (bytes32 mode) {
        mode = bytes32(callType) | 
               (bytes32(execType) << 8) | 
               (bytes32(modeSelector) << 32) | 
               (bytes32(modePayload) << 80);
    }

    /**
     * @notice Encodes simple execution mode
     * @param callType The call type
     * @param execType The execution type  
     * @return mode The encoded execution mode
     */
    function encodeSimpleMode(bytes1 callType, bytes1 execType) 
        internal 
        pure 
        returns (bytes32 mode) 
    {
        return encodeMode(callType, execType, bytes4(0), bytes22(0));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                 DECODING
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Decodes execution mode into components
     * @param mode The encoded execution mode
     * @return callType The call type
     * @return execType The execution type
     * @return modeSelector The mode selector
     * @return modePayload The mode payload
     */
    function decodeMode(bytes32 mode) 
        internal 
        pure 
        returns (
            bytes1 callType,
            bytes1 execType, 
            bytes4 modeSelector,
            bytes22 modePayload
        ) 
    {
        callType = bytes1(mode);
        execType = bytes1(mode << 8);
        modeSelector = bytes4(mode << 32);
        modePayload = bytes22(mode << 80);
    }

    /**
     * @notice Gets the call type from execution mode
     * @param mode The encoded execution mode
     * @return callType The call type
     */
    function getCallType(bytes32 mode) internal pure returns (bytes1 callType) {
        return bytes1(mode & CALLTYPE_MASK);
    }

    /**
     * @notice Gets the execution type from execution mode  
     * @param mode The encoded execution mode
     * @return execType The execution type
     */
    function getExecType(bytes32 mode) internal pure returns (bytes1 execType) {
        return bytes1((mode & EXECTYPE_MASK) >> 8);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                 VALIDATION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if the mode is a single call
     * @param mode The execution mode to check
     * @return True if single call, false otherwise
     */
    function isSingleCall(bytes32 mode) internal pure returns (bool) {
        return (mode & CALLTYPE_MASK) == CALLTYPE_SINGLE;
    }

    /**
     * @notice Checks if the mode is a batch call
     * @param mode The execution mode to check  
     * @return True if batch call, false otherwise
     */
    function isBatchCall(bytes32 mode) internal pure returns (bool) {
        return (mode & CALLTYPE_MASK) == CALLTYPE_BATCH;
    }

    /**
     * @notice Checks if the mode is a static call
     * @param mode The execution mode to check
     * @return True if static call, false otherwise  
     */
    function isStaticCall(bytes32 mode) internal pure returns (bool) {
        return (mode & CALLTYPE_MASK) == CALLTYPE_STATIC;
    }

    /**
     * @notice Checks if the mode is a delegate call
     * @param mode The execution mode to check
     * @return True if delegate call, false otherwise
     */
    function isDelegateCall(bytes32 mode) internal pure returns (bool) {
        return (mode & CALLTYPE_MASK) == CALLTYPE_DELEGATECALL;
    }

    /**
     * @notice Checks if the mode uses try execution (no revert on failure)
     * @param mode The execution mode to check
     * @return True if try execution, false otherwise
     */
    function isTryExecution(bytes32 mode) internal pure returns (bool) {
        return (mode & EXECTYPE_MASK) == EXECTYPE_TRY;
    }
}
