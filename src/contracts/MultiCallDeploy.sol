// Copyright (c) Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.27;

import './modules/commons/interfaces/IModuleCalls.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import './interfaces/IFactory.sol';
import './interfaces/INexusAccountFactory.sol';

/**
 * @title MultiCallDeploy
 * @notice This contract is bundles the wallet deployment and the users first write transaction into a single transaction.
 *         Contract usage is intended for the submitter inside the relayer service, which will call either of the functions.
 */
contract MultiCallDeploy is AccessControl {
  // Role to execute functions
  bytes32 public constant EXECUTOR_ROLE = keccak256('EXECUTOR_ROLE');

  event BatchExecuted(address indexed wallet, bytes32 indexed salt);

  constructor(address _admin, address _executor) {
    _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    _grantRole(EXECUTOR_ROLE, _executor);
  }

  /*
   * @dev Grants EXECUTOR_ROLE to an user.
   * @param _executor Address that will be allowed to execute functions
   */
  function grantExecutorRole(address _executor) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(EXECUTOR_ROLE, _executor);
  }

  /*
   * @dev Deploy wallet and execute transaction (Legacy Factory).
   * @param _mainModule Address of the main module to be used by the wallet
   * @param _salt Salt used to generate the address
   * @param factory address of the factory contract
   * @param _txs transaction to execute
   * @param _nonce nonce of the wallet
   * @param _signature transaction signature from wallet
   */
  function deployExecute(
    address _mainModule,
    bytes32 _salt,
    address factory,
    IModuleCalls.Transaction[] calldata _txs,
    uint256 _nonce,
    bytes calldata _signature
  ) external onlyRole(EXECUTOR_ROLE) {
    address ret = IFactory(factory).deploy(_mainModule, _salt);
    IModuleCalls(ret).execute(_txs, _nonce, _signature);
  }

  /*
   * @dev Deploy Nexus wallet and execute transaction (NEW NexusAccountFactory - simplified signature).
   * @param _mainModule Address of the main module to be used by the wallet (Nexus implementation)
   * @param _salt Salt used to generate the address
   * @param nexusFactory address of the NexusAccountFactory contract
   * @param _txs transaction to execute
   * @param _nonce nonce of the wallet
   * @param _signature transaction signature from wallet
   */
  function deployExecuteNexus(
    address _mainModule,
    bytes32 _salt,
    address nexusFactory,
    IModuleCalls.Transaction[] calldata _txs,
    uint256 _nonce,
    bytes calldata _signature
  ) external onlyRole(EXECUTOR_ROLE) {
    // Deploy new wallet (same signature as legacy deployExecute)
    address payable wallet = INexusAccountFactory(nexusFactory).createAccount(_mainModule, _salt);

    // Execute initialization directly using wallet's selfExecute
    IModuleCalls(wallet).selfExecute(_txs);

    emit BatchExecuted(wallet, _salt);
  }

  /*
   * @dev Handles deployment of wallet and transaction execution for both cases
   * @param cfa counter factual address of the wallet
   * @param _mainModule Address of the main module to be used by the wallet
   * @param _salt Salt used to generate the address
   * @param factory address of the factory contract
   * @param _txs transaction to execute
   * @param _nonce nonce of the wallet
   * @param _signature transaction signature from wallet
   */
  function deployAndExecute(
    address cfa,
    address _mainModule,
    bytes32 _salt,
    address factory,
    IModuleCalls.Transaction[] calldata _txs,
    uint256 _nonce,
    bytes calldata _signature
  ) external onlyRole(EXECUTOR_ROLE) {
    // Get code size at CFA
    uint32 size;
    assembly {
      size := extcodesize(cfa)
    }

    // If size is 0, deploy the proxy and execute write tx
    // Else, execute the users transaction
    if (size == 0) {
      address ret = IFactory(factory).deploy(_mainModule, _salt);
      require(cfa == ret, 'MultiCallDeploy: deployed address does not match CFA');
      IModuleCalls(ret).execute(_txs, _nonce, _signature);
    } else {
      IModuleCalls(cfa).execute(_txs, _nonce, _signature);
    }
  }

  /*
   * @dev Handles deployment of Nexus wallet and transaction execution for both cases (NEW NexusAccountFactory - simplified signature)
   * @param cfa counter factual address of the wallet
   * @param _mainModule Address of the main module to be used by the wallet (Nexus implementation)
   * @param _salt Salt used to generate the address
   * @param nexusFactory address of the NexusAccountFactory contract
   * @param _txs transaction to execute
   * @param _nonce nonce of the wallet
   * @param _signature transaction signature from wallet
   */
  function deployAndExecuteNexus(
    address cfa,
    address _mainModule,
    bytes32 _salt,
    address nexusFactory,
    IModuleCalls.Transaction[] calldata _txs,
    uint256 _nonce,
    bytes calldata _signature
  ) external onlyRole(EXECUTOR_ROLE) {
    // Get code size at CFA
    uint32 size;
    assembly {
      size := extcodesize(cfa)
    }

    // If size is 0, deploy the Nexus and execute write tx
    // Else, execute the users transaction
    if (size == 0) {
      address payable wallet = INexusAccountFactory(nexusFactory).createAccount(_mainModule, _salt);
      require(cfa == wallet, 'MultiCallDeploy: deployed address does not match CFA');

      // Execute initialization directly using wallet's selfExecute
      IModuleCalls(wallet).selfExecute(_txs);
    } else {
      // Execute directly on existing wallet using selfExecute
      IModuleCalls(cfa).selfExecute(_txs);
    }

    emit BatchExecuted(cfa, _salt);
  }
}
