// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC7579Hook} from "../interfaces/erc7579/IERC7579Hook.sol";
import {ModuleTypeLib} from "../utils/erc7579/ModuleTypeLib.sol";

/**
 * @title HookLib
 * @notice Library for handling ERC-7579 hook execution logic
 * @dev Extracts hook-related functions to reduce main contract size
 */
library HookLib {
    /*//////////////////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////////////////*/

    error HookExecutionFailed();

    /*//////////////////////////////////////////////////////////////////////////
                                HOOK EXECUTION
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Calls pre-execution hooks
     * @param hooks Array of installed hook modules
     * @param msgSender The message sender
     * @param value The transaction value
     * @param msgData The message data
     * @return hookData Context data for post-execution hooks
     */
    function callPreHooks(
        address[] memory hooks,
        address msgSender,
        uint256 value,
        bytes calldata msgData
    ) external returns (bytes memory hookData) {
        for (uint256 i = 0; i < hooks.length; i++) {
            try IERC7579Hook(hooks[i]).preCheck(msgSender, value, msgData) returns (bytes memory data) {
                hookData = data; // Use the last hook's data
            } catch {
                // Continue if hook fails (non-critical)
                // In production, you might want to emit an event or handle this differently
            }
        }
    }

    /**
     * @notice Calls post-execution hooks
     * @param hooks Array of installed hook modules
     * @param hookData Context data from pre-execution hooks
     */
    function callPostHooks(
        address[] memory hooks,
        bytes memory hookData
    ) external {
        for (uint256 i = 0; i < hooks.length; i++) {
            try IERC7579Hook(hooks[i]).postCheck(hookData) {
                // Hook executed successfully
            } catch {
                // Continue if hook fails (non-critical)
                // In production, you might want to emit an event or handle this differently
            }
        }
    }

    /**
     * @notice Calls pre-execution hooks with error handling
     * @param hooks Array of installed hook modules
     * @param msgSender The message sender
     * @param value The transaction value
     * @param msgData The message data
     * @param revertOnFailure Whether to revert if any hook fails
     * @return hookData Context data for post-execution hooks
     * @return success Whether all hooks executed successfully
     */
    function callPreHooksWithErrorHandling(
        address[] memory hooks,
        address msgSender,
        uint256 value,
        bytes calldata msgData,
        bool revertOnFailure
    ) external returns (bytes memory hookData, bool success) {
        success = true;
        
        for (uint256 i = 0; i < hooks.length; i++) {
            try IERC7579Hook(hooks[i]).preCheck(msgSender, value, msgData) returns (bytes memory data) {
                hookData = data; // Use the last hook's data
            } catch {
                success = false;
                if (revertOnFailure) {
                    revert HookExecutionFailed();
                }
            }
        }
    }

    /**
     * @notice Calls post-execution hooks with error handling
     * @param hooks Array of installed hook modules
     * @param hookData Context data from pre-execution hooks
     * @param revertOnFailure Whether to revert if any hook fails
     * @return success Whether all hooks executed successfully
     */
    function callPostHooksWithErrorHandling(
        address[] memory hooks,
        bytes memory hookData,
        bool revertOnFailure
    ) external returns (bool success) {
        success = true;
        
        for (uint256 i = 0; i < hooks.length; i++) {
            try IERC7579Hook(hooks[i]).postCheck(hookData) {
                // Hook executed successfully
            } catch {
                success = false;
                if (revertOnFailure) {
                    revert HookExecutionFailed();
                }
            }
        }
    }

    /**
     * @notice Executes a single hook with detailed error information
     * @param hook The hook module address
     * @param msgSender The message sender
     * @param value The transaction value
     * @param msgData The message data
     * @return success Whether the hook executed successfully
     * @return returnData The return data from the hook
     */
    function executeSinglePreHook(
        address hook,
        address msgSender,
        uint256 value,
        bytes calldata msgData
    ) external returns (bool success, bytes memory returnData) {
        try IERC7579Hook(hook).preCheck(msgSender, value, msgData) returns (bytes memory data) {
            success = true;
            returnData = data;
        } catch Error(string memory reason) {
            success = false;
            returnData = bytes(reason);
        } catch (bytes memory lowLevelData) {
            success = false;
            returnData = lowLevelData;
        }
    }

    /**
     * @notice Executes a single post-hook with detailed error information
     * @param hook The hook module address
     * @param hookData Context data from pre-execution hooks
     * @return success Whether the hook executed successfully
     * @return returnData The return data from the hook
     */
    function executeSinglePostHook(
        address hook,
        bytes memory hookData
    ) external returns (bool success, bytes memory returnData) {
        try IERC7579Hook(hook).postCheck(hookData) {
            success = true;
            returnData = "";
        } catch Error(string memory reason) {
            success = false;
            returnData = bytes(reason);
        } catch (bytes memory lowLevelData) {
            success = false;
            returnData = lowLevelData;
        }
    }
}
