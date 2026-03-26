// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title INexusAccountFactory
 * @notice Interface for NexusAccountFactory to be used by MultiCallDeploy
 */
interface INexusAccountFactory {
  /**
   * @notice Creates a new Nexus account using simplified signature (same as Factory.sol)
   * @param _mainModule Address of the main module to be used by the wallet (Nexus implementation)
   * @param salt Unique salt for the Smart Account creation.
   * @return The address of the newly created Nexus account.
   */
  function createAccount(address _mainModule, bytes32 salt) external payable returns (address payable);

  /**
   * @notice Computes the expected address of a Nexus contract
   * @param _mainModule Address of the main module to be used by the wallet (Nexus implementation)
   * @param salt Unique salt for the Smart Account creation.
   * @return expectedAddress The expected address at which the Nexus contract will be deployed.
   */
  function computeAccountAddress(
    address _mainModule,
    bytes32 salt
  ) external view returns (address payable expectedAddress);
}
