// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./IERC7579Module.sol";

/**
 * @title IERC7579Hook
 * @notice Interface for ERC-7579 hook modules
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
interface IERC7579Hook is IERC7579Module {
    /*//////////////////////////////////////////////////////////////////////////
                                    HOOKS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Called by the smart account before execution
     * @param msgSender The address that called the smart account
     * @param value The value that was sent to the smart account
     * @param msgData The data that was sent to the smart account
     * @return hookData Arbitrary data that will be passed to postCheck
     * 
     * @dev MAY return arbitrary data in the `hookData` return value
     * @dev This function can revert to prevent execution
     */
    function preCheck(address msgSender, uint256 value, bytes calldata msgData) 
        external 
        returns (bytes memory hookData);

    /**
     * @notice Called by the smart account after execution
     * @param hookData The data that was returned by the `preCheck` function
     * 
     * @dev MAY validate the `hookData` to validate transaction context of the `preCheck` function
     * @dev This function can revert to revert the entire transaction
     */
    function postCheck(bytes calldata hookData) external;
}
