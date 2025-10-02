// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.27;

import "../modules/commons/interfaces/IModuleCalls.sol";

/**
 * @title IMultiCallDeploy
 * @notice MultiCallDeploy interface to interact with MultiCallDeploy
 */
interface IMultiCallDeploy {
  function deployExecute(address _mainModule, bytes32 _salt, address factory,  IModuleCalls.Transaction[] calldata _txs, uint256 _nonce, bytes calldata _signature) external;
  function deployAndExecute(address cfa, address _mainModule, bytes32 _salt, address factory,  IModuleCalls.Transaction[] calldata _txs, uint256 _nonce, bytes calldata _signature) external;
}