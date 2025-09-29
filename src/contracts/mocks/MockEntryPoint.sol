// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.27;

/**
 * @title MockEntryPoint
 * @notice A minimal mock EntryPoint for testing purposes
 * @dev This is a simplified version for local development only
 */
contract MockEntryPoint {
  mapping(address => uint256) public balanceOf;

  event UserOperationEvent(
    bytes32 indexed userOpHash,
    address indexed sender,
    address indexed paymaster,
    uint256 nonce,
    bool success,
    uint256 actualGasCost,
    uint256 actualGasUsed
  );

  event Deposited(address indexed account, uint256 totalDeposit);

  /**
   * @notice Deposit ETH for an account
   * @param account The account to deposit for
   */
  function depositTo(address account) external payable {
    balanceOf[account] += msg.value;
    emit Deposited(account, balanceOf[account]);
  }

  /**
   * @notice Get deposit balance for an account
   * @param account The account to check
   * @return The deposit balance
   */
  function getDepositInfo(address account) external view returns (uint256) {
    return balanceOf[account];
  }

  /**
   * @notice Mock function to simulate EntryPoint interface
   */
  function handleOps(bytes[] calldata, address payable) external pure {
    // Mock implementation - does nothing
    return;
  }

  /**
   * @notice Mock function to simulate EntryPoint interface
   */
  function simulateValidation(bytes calldata) external pure returns (uint256) {
    // Mock implementation - returns success
    return 0;
  }
}
