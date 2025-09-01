// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC7579Module} from "./IERC7579Module.sol";

/**
 * @title IERC7579Execution
 * @notice Interface for ERC-7579 compliance
 * @dev Based on ERC-7579 specification: https://eips.ethereum.org/EIPS/eip-7579
 */
interface IERC7579Execution {
    /*//////////////////////////////////////////////////////////////////////////
                                 EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @dev Executes a transaction on behalf of the account. MAY be payable.
     * @param mode The encoded execution mode of the transaction.
     * @param executionCalldata The encoded execution call data.
     *
     * MUST ensure adequate authorization control: e.g. onlyEntryPointOrSelf if used with ERC-4337
     * If a mode is requested that is not supported by the Account, it MUST revert
     */
    function execute(bytes32 mode, bytes calldata executionCalldata) external;

    /**
     * @dev Executes a transaction on behalf of the account. MAY be payable.
     *         This function is intended to be called by Executor Modules
     * @param mode The encoded execution mode of the transaction.
     * @param executionCalldata The encoded execution call data.
     *
     * @return returnData An array with the returned data of each executed subcall
     *
     * MUST ensure adequate authorization control: i.e. onlyExecutorModule
     * If a mode is requested that is not supported by the Account, it MUST revert
     */
    function executeFromExecutor(bytes32 mode, bytes calldata executionCalldata)
        external
        returns (bytes[] memory returnData);
}
