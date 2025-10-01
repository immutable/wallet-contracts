// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title INexusAccountFactory
 * @notice Interface for NexusAccountFactory to be used by MultiCallDeploy
 */
interface INexusAccountFactory {
  /**
   * @notice Creates a new Nexus account using direct Nexus deployment
   * @param initData Initialization data containing [entryPoint, validator, owner] addresses
   * @param salt Unique salt for the Smart Account creation.
   * @return The address of the newly created Nexus account.
   */
  function createAccount(bytes calldata initData, bytes32 salt) external payable returns (address payable);

  /**
   * @notice Computes the expected address of a Nexus contract
   * @param initData Initialization data containing [entryPoint, validator, owner] addresses
   * @param salt Unique salt for the Smart Account creation.
   * @return expectedAddress The expected address at which the Nexus contract will be deployed.
   */
  function computeAccountAddress(
    bytes calldata initData,
    bytes32 salt
  ) external view returns (address payable expectedAddress);
}
