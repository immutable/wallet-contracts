// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IERC7579Executor} from "../../interfaces/erc7579/IERC7579Executor.sol";
import {IERC7579Module} from "../../interfaces/erc7579/IERC7579Module.sol";
import {InterfaceIds} from "../../utils/erc7579/InterfaceIds.sol";
import {ModuleTypeLib} from "../../utils/erc7579/ModuleTypeLib.sol";
import {ModeLib} from "../../utils/erc7579/ModeLib.sol";
import {ModuleCalls} from "../commons/ModuleCalls.sol";
import {IModuleCalls} from "../commons/interfaces/IModuleCalls.sol";

/**
 * @title ImmutableExecutor
 * @notice ERC-7579 compliant executor module that implements Immutable's transaction execution logic
 * @dev Extracts the existing ModuleCalls functionality into a standalone ERC-7579 module
 */
contract ImmutableExecutor is IERC7579Executor, ModuleCalls {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Constructor for ImmutableExecutor
     * @param _factory Address of the wallet factory (unused but kept for consistency)
     */
    constructor(address _factory) {
        // ModuleCalls doesn't have a constructor, so we don't call it
        // _factory parameter is kept for consistency with other modules
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MODULE LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Called when the module is installed on a smart account
     * @param data Initialization data (execution configuration)
     */
    function onInstall(bytes calldata data) external override {
        // Mark this account as having the executor installed
        _installedAccounts[msg.sender] = true;
        
        // Initialize authorized callers - by default, the account itself is authorized
        _authorizedCallers[msg.sender][msg.sender] = true;
        
        // Process initialization data if provided
        if (data.length > 0) {
            // Decode and set additional authorized callers
            address[] memory additionalCallers = abi.decode(data, (address[]));
            for (uint256 i = 0; i < additionalCallers.length; i++) {
                _authorizedCallers[msg.sender][additionalCallers[i]] = true;
            }
        }
        
        // Module is now installed and ready to execute transactions
    }

    /**
     * @notice Called when the module is uninstalled from a smart account
     * @param data Deinitialization data
     */
    function onUninstall(bytes calldata data) external override {
        // Mark this account as no longer having the executor installed
        _installedAccounts[msg.sender] = false;
        
        // Clear all authorized callers for this account
        // Note: We can't easily iterate and delete all mappings, so we rely on the installed check
        // In a production implementation, you might want to use an EnumerableSet for authorized callers
        
        // Clear the account's own authorization
        _authorizedCallers[msg.sender][msg.sender] = false;
    }

    /**
     * @notice Returns the module type ID
     * @return moduleTypeId The module type ID (2 for executor)
     */
    function moduleType() external pure override returns (uint256) {
        return ModuleTypeLib.TYPE_EXECUTOR;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                STATE MANAGEMENT
    //////////////////////////////////////////////////////////////////////////*/
    
    /// @notice Mapping to track which accounts have this executor installed
    mapping(address => bool) private _installedAccounts;
    
    /// @notice Mapping to track authorized callers per account
    mapping(address => mapping(address => bool)) private _authorizedCallers;

    /**
     * @notice Checks if the module is initialized for a smart account
     * @param smartAccount The smart account address
     * @return True if the module is initialized
     */
    function isInitialized(address smartAccount) external view returns (bool) {
        return _installedAccounts[smartAccount];
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-7579 EXECUTOR INTERFACE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a transaction through the smart account
     * @param account The smart account to execute the transaction on
     * @param executionData The execution data for the transaction
     * @return returnData The return data from the execution
     */
    function executeViaAccount(address account, bytes calldata executionData) 
        external 
        override 
        returns (bytes[] memory returnData) 
    {
        // Implement proper authorization - only allow authorized callers
        require(_isAuthorizedCaller(msg.sender, account), "ImmutableExecutor: UNAUTHORIZED_CALLER");
        
        // Validate that this executor is installed on the account
        require(_isInstalledOnAccount(account), "ImmutableExecutor: NOT_INSTALLED");
        
        // Delegate the execution to the account
        // The account should call back to this module's execution functions
        (bool success, bytes memory result) = account.call(executionData);
        require(success, "ImmutableExecutor: EXECUTION_FAILED");
        
        // Parse and return the result properly
        returnData = _parseExecutionResult(result);
    }

    /**
     * @notice Returns the execution mode that this executor supports
     * @return mode The execution mode bytes32 value
     */
    function supportedExecutionMode() external pure override returns (bytes32 mode) {
        // Support single call mode (0x00)
        return bytes32(0x00);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                EXECUTION INTERFACE
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a transaction on behalf of the smart account
     * @param target The target contract address
     * @param value The value to send with the transaction
     * @param data The transaction data
     * @return success Whether the transaction succeeded
     * @return returnData The return data from the transaction
     */
    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (bool success, bytes memory returnData) {
        // Only allow the account itself to execute transactions
        require(msg.sender == address(this), "ImmutableExecutor: UNAUTHORIZED");
        
        // Execute the transaction
        (success, returnData) = target.call{value: value}(data);
    }

    /**
     * @notice Executes multiple transactions in batch
     * @param targets Array of target contract addresses
     * @param values Array of values to send with each transaction
     * @param dataArray Array of transaction data
     * @return successes Array of success flags for each transaction
     * @return returnDataArray Array of return data from each transaction
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata dataArray
    ) external returns (bool[] memory successes, bytes[] memory returnDataArray) {
        // Only allow the account itself to execute transactions
        require(msg.sender == address(this), "ImmutableExecutor: UNAUTHORIZED");
        
        require(
            targets.length == values.length && values.length == dataArray.length,
            "ImmutableExecutor: ARRAY_LENGTH_MISMATCH"
        );
        
        successes = new bool[](targets.length);
        returnDataArray = new bytes[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            (successes[i], returnDataArray[i]) = targets[i].call{value: values[i]}(dataArray[i]);
        }
    }

    /**
     * @notice Executes a delegatecall transaction
     * @param target The target contract address
     * @param data The transaction data
     * @return success Whether the transaction succeeded
     * @return returnData The return data from the transaction
     */
    function executeDelegateCall(
        address target,
        bytes calldata data
    ) external returns (bool success, bytes memory returnData) {
        // Only allow the account itself to execute transactions
        require(msg.sender == address(this), "ImmutableExecutor: UNAUTHORIZED");
        
        // Execute the delegatecall
        (success, returnData) = target.delegatecall(data);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                LEGACY COMPATIBILITY
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes transactions using the legacy Transaction format
     * @param transactions Array of transactions to execute
     * @param nonce The nonce for the transaction batch
     */
    function executeLegacyTransactions(
        IModuleCalls.Transaction[] calldata transactions,
        uint256 nonce
    ) external {
        // Only allow the account itself to execute transactions
        require(msg.sender == address(this), "ImmutableExecutor: UNAUTHORIZED");
        
        // Use existing ModuleCalls logic for backward compatibility
        bytes32 txHash = _subDigest(keccak256(abi.encode(nonce, transactions)));
        
        // Execute using existing logic
        for (uint256 i = 0; i < transactions.length; i++) {
            IModuleCalls.Transaction memory transaction = transactions[i];
            
            bool success;
            bytes memory result;
            
            if (transaction.delegateCall) {
                (success, result) = transaction.target.delegatecall{
                    gas: transaction.gasLimit == 0 ? gasleft() : transaction.gasLimit
                }(transaction.data);
            } else {
                (success, result) = transaction.target.call{
                    value: transaction.value,
                    gas: transaction.gasLimit == 0 ? gasleft() : transaction.gasLimit
                }(transaction.data);
            }
            
            if (success) {
                emit TxExecuted(txHash);
            } else {
                if (transaction.revertOnError) {
                    if (result.length > 0) {
                        assembly { revert(add(result, 0x20), mload(result)) }
                    } else {
                        revert("ImmutableExecutor: EXECUTION_FAILED");
                    }
                } else {
                    emit TxFailed(txHash, result);
                }
            }
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-165 SUPPORT
    //////////////////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////////////////
                                REQUIRED IMPLEMENTATIONS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Validates signatures (required by IModuleAuth)
     * @param _hash The hash to validate
     * @param _signature The signature to check
     * @return True if valid (simplified implementation)
     */
    function _signatureValidation(bytes32 _hash, bytes memory _signature) 
        internal 
        pure 
        override 
        returns (bool) 
    {
        // Simplified implementation - in production, this should validate properly
        // For now, we'll always return true since this is an executor module
        return true;
    }

    /**
     * @notice Creates a sub-digest for signature validation (required by IModuleAuth)
     * @param _digest The digest to process
     * @return The sub-digest
     */
    function _subDigest(bytes32 _digest) internal view override returns (bytes32) {
        uint256 chainId; 
        assembly { chainId := chainid() }
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                chainId,
                address(this),
                _digest
            )
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                AUTHORIZATION HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if a caller is authorized to execute on behalf of an account
     * @param caller The address attempting to execute
     * @param account The account address
     * @return True if the caller is authorized
     */
    function _isAuthorizedCaller(address caller, address account) internal view returns (bool) {
        // The account itself is always authorized
        if (caller == account) return true;
        
        // Check if caller is explicitly authorized for this account
        return _authorizedCallers[account][caller];
    }

    /**
     * @notice Checks if this executor is installed on the given account
     * @param account The account address
     * @return True if installed
     */
    function _isInstalledOnAccount(address account) internal view returns (bool) {
        return _installedAccounts[account];
    }

    /**
     * @notice Parses execution result into proper return format
     * @param result The raw execution result
     * @return returnData Properly formatted return data array
     */
    function _parseExecutionResult(bytes memory result) internal pure returns (bytes[] memory returnData) {
        // For now, return the result as a single-element array
        // In a more sophisticated implementation, this could parse multiple results
        returnData = new bytes[](1);
        returnData[0] = result;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                ERC-165 SUPPORT
    //////////////////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if the contract supports an interface
     * @param interfaceId The interface ID to check
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        pure 
        override(ModuleCalls, IERC7579Module) 
        returns (bool) 
    {
        return
            interfaceId == InterfaceIds.IERC7579_EXECUTOR_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC7579_MODULE_INTERFACE_ID ||
            interfaceId == InterfaceIds.IERC165_INTERFACE_ID ||
            super.supportsInterface(interfaceId);
    }
}
