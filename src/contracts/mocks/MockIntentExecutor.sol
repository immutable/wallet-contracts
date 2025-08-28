// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC7579Account} from "../interfaces/erc7579/IERC7579Account.sol";

/**
 * @title MockIntentExecutor
 * @notice Mock contract that simulates Rhinestone's IntentExecutor behavior
 * @dev Used for testing ERC-7579 executeFromExecutor compatibility
 */
contract MockIntentExecutor {
    
    /**
     * @notice Simulates Rhinestone's IntentExecutor calling executeFromExecutor
     * @param account The ERC-7579 account to execute on
     * @param mode The execution mode
     * @param executionCalldata The execution calldata
     * @return returnData The return data from execution
     */
    function executeViaAccount(
        address account,
        bytes32 mode,
        bytes calldata executionCalldata
    ) external returns (bytes[] memory returnData) {
        // This simulates how Rhinestone's IntentExecutor would call the account
        // The account must have this executor installed as a module
        return IERC7579Account(account).executeFromExecutor(mode, executionCalldata);
    }
    
    /**
     * @notice Mock function to simulate module installation requirements
     * @return Always returns true for simplicity
     */
    function isValidModule() external pure returns (bool) {
        return true;
    }
    
    /**
     * @notice Mock function to simulate intent processing
     * @param intent The intent data (unused in mock)
     * @return processed Always returns true
     */
    function processIntent(bytes calldata intent) external pure returns (bool processed) {
        // In a real IntentExecutor, this would process the intent
        // and determine the appropriate execution parameters
        return true;
    }
}
