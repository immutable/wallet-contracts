// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import '@openzeppelin/contracts/access/AccessControl.sol';
import './interfaces/factory/INexusFactory.sol';
import './Nexus.sol';
import './lib/ModeLib.sol';

/**
 * @title NexusMultiCallDeploy
 * @notice This contract bundles the wallet deployment and the user's first write transaction into a single transaction.
 *         Contract usage is intended for the submitter inside the relayer service, which will call either of the functions.
 *         This implementation is compatible with the Nexus architecture while maintaining similar interface to the original
 *         Passport's MultiCallDeploy.
 * @dev This is the Nexus-specific implementation of MultiCallDeploy pattern. For the original Passport implementation,
 *      see contracts/MultiCallDeploy.sol
 */
contract NexusMultiCallDeploy is AccessControl {
  using ModeLib for ExecutionMode;

  // Role to execute functions
  bytes32 public constant EXECUTOR_ROLE = keccak256('EXECUTOR_ROLE');

  // Events
  event BatchExecuted(address indexed wallet, bytes32 indexed salt);

  constructor(address _admin, address _executor) {
    _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    _grantRole(EXECUTOR_ROLE, _executor);
  }

  /**
   * @dev Grants EXECUTOR_ROLE to a user.
   * @param _executor Address that will be allowed to execute functions
   */
  function grantExecutorRole(address _executor) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(EXECUTOR_ROLE, _executor);
  }

  /**
   * @dev Deploy wallet and execute transaction.
   * @param _salt Salt used to generate the address
   * @param factory Address of the NexusAccountFactory
   * @param _initData Initialization data for the wallet
   * @param _transactions Encoded batch transaction data
   * @notice This function maintains the same interface as Passport's MultiCallDeploy.deployExecute
   *         but uses Nexus-specific implementation internally
   */
  function deployExecute(
    address /* _implementation */,
    bytes32 _salt,
    address factory,
    bytes calldata _initData,
    bytes calldata _transactions,
    bytes calldata /* _signature */
  ) external onlyRole(EXECUTOR_ROLE) {
    // Deploy new wallet
    address payable wallet = INexusFactory(factory).createAccount(_initData, _salt);

    // Execute batch transaction using Nexus's batch execution mode
    ExecutionMode mode = ModeLib.encode(CALLTYPE_BATCH, EXECTYPE_DEFAULT, MODE_DEFAULT, ModePayload.wrap(0x00));
    Nexus(payable(wallet)).execute(mode, _transactions);

    emit BatchExecuted(wallet, _salt);
  }

  /**
   * @dev Handles deployment of wallet and transaction execution for both cases
   * @param cfa Counter factual address of the wallet
   * @param _salt Salt used to generate the address
   * @param factory Address of the NexusAccountFactory
   * @param _initData Initialization data for the wallet
   * @param _transactions Encoded batch transaction data
   * @notice This function maintains the same interface as Passport's MultiCallDeploy.deployAndExecute
   *         but uses Nexus-specific implementation internally
   */
  function deployAndExecute(
    address cfa,
    address /* _implementation */,
    bytes32 _salt,
    address factory,
    bytes calldata _initData,
    bytes calldata _transactions,
    bytes calldata /* _signature */
  ) external onlyRole(EXECUTOR_ROLE) {
    // Get code size at CFA
    uint32 size;
    assembly {
      size := extcodesize(cfa)
    }

    // Create batch execution mode
    ExecutionMode mode = ModeLib.encode(CALLTYPE_BATCH, EXECTYPE_DEFAULT, MODE_DEFAULT, ModePayload.wrap(0x00));

    // If size is 0, deploy the proxy and execute write tx
    // Else, execute the users transaction
    if (size == 0) {
      address payable wallet = INexusFactory(factory).createAccount(_initData, _salt);
      require(cfa == wallet, 'NexusMultiCallDeploy: deployed address does not match CFA');

      // Execute batch transaction
      Nexus(payable(wallet)).execute(mode, _transactions);
    } else {
      // Execute batch transaction on existing wallet
      Nexus(payable(cfa)).execute(mode, _transactions);
    }

    emit BatchExecuted(cfa, _salt);
  }
}
