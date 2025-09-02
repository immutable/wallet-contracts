// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.27;

import "./commons/ModuleAuthUpgradable.sol";
import "./commons/ModuleHooks.sol";
import "./commons/ModuleCalls.sol";
import "./commons/ModuleUpdate.sol";
import "./commons/ModuleCreator.sol";

import { PackedUserOperation } from "account-abstraction/interfaces/PackedUserOperation.sol";
import { ExecLib } from "../lib/ExecLib.sol";
import { IERC7484 } from "../interfaces/IERC7484.sol";
import { ModuleManager } from "../modules/commons/ModuleManager.sol";
import { ExecutionHelper } from "../modules/commons/ExecutionHelper.sol";
import { IValidator } from "../modules/commons/interfaces/modules/IValidator.sol";
import {
    MODULE_TYPE_VALIDATOR,
    MODULE_TYPE_EXECUTOR,
    MODULE_TYPE_FALLBACK,
    MODULE_TYPE_HOOK,
    MODULE_TYPE_MULTI,
    MODULE_TYPE_PREVALIDATION_HOOK_ERC1271,
    MODULE_TYPE_PREVALIDATION_HOOK_ERC4337,
    SUPPORTS_ERC7739,
    VALIDATION_SUCCESS,
    VALIDATION_FAILED
} from "../types/Constants.sol";
import {
    ModeLib,
    ExecutionMode,
    ExecType,
    CallType,
    CALLTYPE_BATCH,
    CALLTYPE_SINGLE,
    CALLTYPE_DELEGATECALL,
    EXECTYPE_DEFAULT,
    EXECTYPE_TRY
} from "../lib/ModeLib.sol";
import { NonceLib } from "../lib/NonceLib.sol";
import { SentinelListLib, SENTINEL, ZERO_ADDRESS } from "sentinellist/SentinelList.sol";
import { EmergencyUninstall } from "../types/DataTypes.sol";
import { LibPREP } from "../lib/LibPREP.sol";
import { ECDSA } from "solady/utils/ECDSA.sol";


/**
 * @notice Contains the core functionality arcadeum wallets will inherit with
 *         the added functionality that the main-module can be changed.
 * @dev If using a new main module, developpers must ensure that all inherited
 *      contracts by the mainmodule don't conflict and are accounted for to be
 *      supported by the supportsInterface method.
 */
contract MainModuleUpgradable is
  ModuleAuthUpgradable,
  ModuleCalls,
  ModuleUpdate,
  ModuleHooks,
  ModuleCreator,
  ExecutionHelper, 
  ModuleManager
{
  using ModeLib for ExecutionMode;
    using ExecLib for bytes;
    using NonceLib for uint256;
    using SentinelListLib for SentinelListLib.SentinelList;

    /// @notice Identifier for this implementation on the network
    string internal constant _ACCOUNT_IMPLEMENTATION_ID = "immutable.wallet.PassportV2";

    /// @dev Cached implementation address;
    address immutable _IMPLEMENTATION;

    /// @dev The event emitted when an emergency hook uninstallation is initiated.
    event EmergencyHookUninstallRequest(address hook, uint256 timestamp);

    /// @dev The event emitted when an emergency hook uninstallation request is reset.
    event EmergencyHookUninstallRequestReset(address hook, uint256 timestamp);

    // EventsAndErrors

    /// @notice Emitted when a PREP is initialized.
    /// @param r The r value of the PREP signature.
    event PREPInitialized(bytes32 r);

    /// @notice Error thrown when an unsupported ModuleType is requested.
    /// @param moduleTypeId The ID of the unsupported module type.
    error UnsupportedModuleType(uint256 moduleTypeId);

    /// @notice Error thrown on failed execution.
    error ExecutionFailed();

    /// @notice Error thrown when the Factory fails to initialize the account with posted bootstrap data.
    error NexusInitializationFailed();

    /// @notice Error thrown when a zero address is provided as the Entry Point address.
    error EntryPointCanNotBeZero();

    /// @notice Error thrown when the provided implementation address is invalid.
    error InvalidImplementationAddress();

    /// @notice Error thrown when the provided implementation address is not a contract.
    error ImplementationIsNotAContract();

    /// @notice Error thrown when an inner call fails.
    error InnerCallFailed();

    /// @notice Error thrown when attempted to emergency-uninstall a hook
    error EmergencyTimeLockNotExpired();

    /// @notice Error thrown when attempted to upgrade an ERC7702 account via UUPS proxy upgrade mechanism
    error ERC7702AccountCannotBeUpgradedThisWay();

    /// @notice Error thrown when the provided initData is invalid.
    error InvalidInitData();

    /// @notice Error thrown when the provided authHash and erc7702AuthSignature are invalid.
    error InvalidPREP();

    /// @notice Error thrown when the account is already initialized.
    error AccountAlreadyInitialized();

    /// @notice Error thrown when the account is not initialized but expected to be.
    error AccountNotInitialized();

    /// @notice Error thrown when the provided signature is invalid.
    error InvalidSignature();

    /// @notice Error thrown when a caller is not authorized to access an account.
    error AccountAccessUnauthorized();

        /// @notice The canonical address for the ERC4337 EntryPoint contract, version 0.7.
    /// This address is consistent across all supported networks.
    address internal immutable _ENTRYPOINT;

    /// @dev Ensures the caller is either the EntryPoint or this account itself.
    /// Reverts with AccountAccessUnauthorized if the check fails.
    modifier onlyEntryPointOrSelf() {
        require(msg.sender == _ENTRYPOINT || msg.sender == address(this), AccountAccessUnauthorized());
        _;
    }

    /// @dev Ensures the caller is the EntryPoint.
    /// Reverts with AccountAccessUnauthorized if the check fails.
    modifier onlyEntryPoint() {
        require(msg.sender == _ENTRYPOINT, AccountAccessUnauthorized());
        _;
    }

    /// @notice Initializes the smart account with the specified entry point.
    constructor(address anEntryPoint, address defaultValidator, bytes memory initData) {
        require(address(anEntryPoint) != address(0), EntryPointCanNotBeZero());
        _ENTRYPOINT = anEntryPoint;
        _IMPLEMENTATION = address(this);
    }

    /// @notice Executes transactions from an executor module, supporting both single and batch transactions.
    /// @param mode The execution mode (single or batch, default or try).
    /// @param executionCalldata The transaction data to execute.
    /// @return returnData The results of the transaction executions, which may include errors in try mode.
    /// @dev This function is callable only by an executor module and goes through hook checks.
    function executeFromExecutor(
        ExecutionMode mode,
        bytes calldata executionCalldata
    )
        external
        payable
        onlyExecutorModule
        withHook
        withRegistry(msg.sender, MODULE_TYPE_EXECUTOR)
        returns (bytes[] memory returnData)
    {
        (CallType callType, ExecType execType) = mode.decodeBasic();
        // check if calltype is batch or single or delegate call
        if (callType == CALLTYPE_SINGLE) {
            returnData = _handleSingleExecutionAndReturnData(executionCalldata, execType);
        } else if (callType == CALLTYPE_BATCH) {
            returnData = _handleBatchExecutionAndReturnData(executionCalldata, execType);
        } else if (callType == CALLTYPE_DELEGATECALL) {
            returnData = _handleDelegateCallExecutionAndReturnData(executionCalldata, execType);
        } else {
            revert UnsupportedCallType(callType);
        }
    }

    // Removing as this is from the ComposableExecutionBase contract which has been excluded. 
    // /// @notice Executes a call to a target address with specified value and data.
    // /// @param to The address to execute the action on
    // /// @param value The value to send with the action
    // /// @param data The data to send with the action
    // /// @return result The result of the execution
    // function _executeAction(address to, uint256 value, bytes memory data) internal override returns (bytes memory) {
    //     return _executeMemory(to, value, data);
    // }

    /// @notice Installs a new module to the smart account.
    /// @param moduleTypeId The type identifier of the module being installed, which determines its role:
    /// - 1 for Validator
    /// - 2 for Executor
    /// - 3 for Fallback
    /// - 4 for Hook
    /// - 8 for 1271 Prevalidation Hook
    /// - 9 for 4337 Prevalidation Hook
    /// @param module The address of the module to install.
    /// @param initData Initialization data for the module.
    /// @dev This function can only be called by the EntryPoint or the account itself for security reasons.
    /// @dev This function goes through hook checks via withHook modifier through internal function _installModule.
    function installModule(uint256 moduleTypeId, address module, bytes calldata initData) external payable virtual override onlySelf {
        _installModule(moduleTypeId, module, initData);
        emit ModuleInstalled(moduleTypeId, module);
    }

    /// @notice Uninstalls a module from the smart account.
    /// @param moduleTypeId The type ID of the module to be uninstalled, matching the installation type:
    /// - 1 for Validator
    /// - 2 for Executor
    /// - 3 for Fallback
    /// - 4 for Hook
    /// - 8 for 1271 Prevalidation Hook
    /// - 9 for 4337 Prevalidation Hook
    /// @dev Attention: All the underlying functions _uninstall[ModuleType] are calling module.onInstall() method.
    /// If the module is malicious (which is not likely because such a module won't be attested), it can prevent
    /// itself from being uninstalled by spending all gas in the onUninstall() method. Then 1/64 gas left can
    /// be not enough to finish the uninstallation, assuming there may be hook postCheck() call.
    /// In this highly unlikely scenario, user will have to uninstall the hook, then uninstall the malicious
    /// module => in this case 1/64 gas left should be enough to finish the uninstallation.
    /// @param module The address of the module to uninstall.
    /// @param deInitData De-initialization data for the module.
    /// @dev Ensures that the operation is authorized and valid before proceeding with the uninstallation.
    function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) external payable onlySelf withHook {
        require(_isModuleInstalled(moduleTypeId, module, deInitData), ModuleNotInstalled(moduleTypeId, module));

        if (moduleTypeId == MODULE_TYPE_VALIDATOR) {
            _uninstallValidator(module, deInitData);
            _checkInitializedValidators();
        } else if (moduleTypeId == MODULE_TYPE_EXECUTOR) {
            _uninstallExecutor(module, deInitData);
        } else if (moduleTypeId == MODULE_TYPE_FALLBACK) {
            _uninstallFallbackHandler(module, deInitData);
        } else if (
            moduleTypeId == MODULE_TYPE_HOOK || moduleTypeId == MODULE_TYPE_PREVALIDATION_HOOK_ERC1271 || moduleTypeId == MODULE_TYPE_PREVALIDATION_HOOK_ERC4337
        ) {
            _uninstallHook(module, moduleTypeId, deInitData);
        }
        emit ModuleUninstalled(moduleTypeId, module);
    }

    /// @notice Sets the registry for the smart account.
    /// @param newRegistry The new registry to set.
    /// @param attesters The attesters to set.
    /// @param threshold The threshold to set.
    /// @dev This function can only be called by the EntryPoint or the account itself.
    function setRegistry(IERC7484 newRegistry, address[] calldata attesters, uint8 threshold) external payable {
        require(msg.sender == address(this), AccountAccessUnauthorized());
        _configureRegistry(newRegistry, attesters, threshold);
    }

    /// @notice Validates a signature according to ERC-1271 standards.
    /// @param hash The hash of the data being validated.
    /// @param signature Signature data that needs to be validated.
    /// @return The status code of the signature validation (`0x1626ba7e` if valid).
    /// bytes4(keccak256("isValidSignature(bytes32,bytes)") = 0x1626ba7e
    /// @dev Delegates the validation to a validator module specified within the signature data.
    function isValidSignature(bytes32 hash, bytes calldata signature) external view virtual override returns (bytes4) {
        // Handle potential ERC7739 support detection request
        if (signature.length == 0) {
            // Forces the compiler to optimize for smaller bytecode size.
            if (uint256(hash) == (~signature.length / 0xffff) * 0x7739) {
                return checkERC7739Support(hash, signature);
            }
        }
        // else proceed with normal signature verification
        // First 20 bytes of data will be validator address and rest of the bytes is complete signature.
        address validator = _handleValidator(address(bytes20(signature[0:20])));

        if (validator == address(0)) {
            // Fall back to default signature validation
            if (_signatureValidationInternal(_subDigest(hash), signature)) {
                return 0x1626ba7e; // ERC1271_MAGICVALUE_BYTES32
            }
            return 0xffffffff;
        } else {
            bytes memory signature_;
            (hash, signature_) = _withPreValidationHook(hash, signature[20:]);
            try IValidator(validator).isValidSignatureWithSender(msg.sender, hash, signature_) returns (bytes4 res) {
                return res;
            } catch {
                return bytes4(0xffffffff);
            }
        }
    }

    // Removing as this is from the UUPSUpgradeable contract which has been excluded. 
    // /// @notice Retrieves the address of the current implementation from the EIP-1967 slot.
    // /// @notice Checks the 1967 implementation slot, if not found then checks the slot defined by address (Biconomy V2 smart account)
    // /// @return implementation The address of the current contract implementation.
    // function getImplementation() external view returns (address implementation) {
    //     assembly {
    //         implementation := sload(_ERC1967_IMPLEMENTATION_SLOT)
    //     }
    //     if (implementation == address(0)) {
    //         assembly {
    //             implementation := sload(address())
    //         }
    //     }
    // }

    /// @notice Checks if a specific module type is supported by this smart account.
    /// @param moduleTypeId The identifier of the module type to check.
    /// @return True if the module type is supported, false otherwise.
    function supportsModule(uint256 moduleTypeId) external view virtual returns (bool) {
        if (
            moduleTypeId == MODULE_TYPE_VALIDATOR || moduleTypeId == MODULE_TYPE_EXECUTOR || moduleTypeId == MODULE_TYPE_FALLBACK
                || moduleTypeId == MODULE_TYPE_HOOK || moduleTypeId == MODULE_TYPE_PREVALIDATION_HOOK_ERC1271
                || moduleTypeId == MODULE_TYPE_PREVALIDATION_HOOK_ERC4337 || moduleTypeId == MODULE_TYPE_MULTI
        ) {
            return true;
        }
        return false;
    }

    /// @notice Determines if a specific execution mode is supported.
    /// @param mode The execution mode to evaluate.
    /// @return isSupported True if the execution mode is supported, false otherwise.
    function supportsExecutionMode(ExecutionMode mode) external view virtual returns (bool isSupported) {
        (CallType callType, ExecType execType) = mode.decodeBasic();

        // Return true if both the call type and execution type are supported.
        return (callType == CALLTYPE_SINGLE || callType == CALLTYPE_BATCH || callType == CALLTYPE_DELEGATECALL)
            && (execType == EXECTYPE_DEFAULT || execType == EXECTYPE_TRY);
    }

    /// @notice Determines whether a module is installed on the smart account.
    /// @param moduleTypeId The ID corresponding to the type of module (Validator, Executor, Fallback, Hook).
    /// @param module The address of the module to check.
    /// @param additionalContext Optional context that may be needed for certain checks.
    /// @return True if the module is installed, false otherwise.
    function isModuleInstalled(uint256 moduleTypeId, address module, bytes calldata additionalContext) external view returns (bool) {
        return _isModuleInstalled(moduleTypeId, module, additionalContext);
    }

    /// @notice Checks if the smart account is initialized.
    /// @return True if the smart account is initialized, false otherwise.
    /// @dev In case default validator is initialized, two other SLOADS from _areSentinelListsInitialized() are not checked,
    /// this method should not introduce huge gas overhead.
    function isInitialized() public view returns (bool) {
        return (IValidator(_DEFAULT_VALIDATOR).isInitialized(address(this)) || _areSentinelListsInitialized());
    }

    /// Returns the account's implementation ID.
    /// @return The unique identifier for this account implementation.
    function accountId() external pure virtual returns (string memory) {
        return _ACCOUNT_IMPLEMENTATION_ID;
    }

    /// @dev For automatic detection that the smart account supports the ERC7739 workflow
    /// Iterates over all the validators but only if this is a detection request
    /// ERC-7739 spec assumes that if the account doesn't support ERC-7739
    /// it will try to handle the detection request as it was normal sig verification
    /// request and will return 0xffffffff since it won't be able to verify the 0x signature
    /// against 0x7739...7739 hash.
    /// So this approach is consistent with the ERC-7739 spec.
    /// If no validator supports ERC-7739, this function returns false
    /// thus the account will proceed with normal signature verification
    /// and return 0xffffffff as a result.
    function checkERC7739Support(bytes32 hash, bytes calldata signature) public view virtual returns (bytes4) {
        bytes4 result;
        unchecked {
            SentinelListLib.SentinelList storage validators = _getAccountStorage().validators;
            address next = validators.entries[SENTINEL];
            while (next != ZERO_ADDRESS && next != SENTINEL) {
                result = _get7739Version(next, result, hash, signature);
                next = validators.getNext(next);
            }
        }
        result = _get7739Version(_DEFAULT_VALIDATOR, result, hash, signature); // check default validator
        return result == bytes4(0) ? bytes4(0xffffffff) : result;
    }

    function _get7739Version(address validator, bytes4 prevResult, bytes32 hash, bytes calldata signature) internal view returns (bytes4) {
        bytes4 support = IValidator(validator).isValidSignatureWithSender(msg.sender, hash, signature);
        if (bytes2(support) == bytes2(SUPPORTS_ERC7739) && support > prevResult) {
            return support;
        }
        return prevResult;
    }

    function _checkInitializedValidators() internal view {
        if (!_amIERC7702() && !IValidator(_DEFAULT_VALIDATOR).isInitialized(address(this))) {
            unchecked {
                SentinelListLib.SentinelList storage validators = _getAccountStorage().validators;
                address next = validators.entries[SENTINEL];
                while (next != ZERO_ADDRESS && next != SENTINEL) {
                    if (IValidator(next).isInitialized(address(this))) {
                        break;
                    }
                    next = validators.getNext(next);
                }
                if (next == SENTINEL) {
                    //went through all validators and none was initialized
                    revert CanNotRemoveLastValidator();
                }
            }
        }
    }

    /// @dev EIP712 domain name and version.
    function _domainNameAndVersion() internal pure override returns (string memory name, string memory version) {
        name = "Immutable Passport 0Wallet";
        version = "2.0.0";
    }

  /**
   * @notice Query if a contract implements an interface
   * @param _interfaceID The interface identifier, as specified in ERC-165
   * @dev If using a new main module, developpers must ensure that all inherited
   *      contracts by the mainmodule don't conflict and are accounted for to be
   *      supported by the supportsInterface method.
   * @return `true` if the contract implements `_interfaceID`
   */
  function supportsInterface(
    bytes4 _interfaceID
  ) public override(
    ModuleAuthUpgradable,
    ModuleCalls,
    ModuleUpdate,
    ModuleHooks,
    ModuleCreator
  ) pure returns (bool) {
    return super.supportsInterface(_interfaceID);
  }
}
