// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

struct Transaction {
  address to;
  uint256 value;
  bytes data;
}

interface IMultiCallDeploy {
  function deployAndExecute(
    address wallet,
    address implementation,
    bytes32 salt,
    address factory,
    Transaction[] calldata transactions,
    uint256 nonce,
    bytes calldata signature
  ) external payable;
}

interface IPassportCompatibleNexusFactory {
  function createAccount(bytes calldata initData, bytes32 salt) external payable returns (address payable);

  function computeAccountAddress(bytes calldata initData, bytes32 salt) external view returns (address payable);
}

contract HybridMultiCallDeploy {
  IMultiCallDeploy public immutable MULTICALL_DEPLOY;
  IPassportCompatibleNexusFactory public immutable CFA_FACTORY;

  event HybridWalletDeployed(address indexed wallet, bytes32 indexed salt, uint256 transactionCount);

  constructor(address multiCallDeploy, address cfaFactory) {
    MULTICALL_DEPLOY = IMultiCallDeploy(multiCallDeploy);
    CFA_FACTORY = IPassportCompatibleNexusFactory(cfaFactory);
  }

  /**
   * Deploy Nexus wallet via CFA Factory + Execute initial transactions via MultiCall pattern
   */
  function deployNexusAndExecute(
    bytes calldata initData,
    bytes32 salt,
    Transaction[] calldata transactions
  ) external payable returns (address payable wallet) {
    // Step 1: Deploy Nexus wallet via CFA Factory
    wallet = CFA_FACTORY.createAccount{value: 0}(initData, salt);

    // Step 2: Execute initial transactions directly on the deployed wallet
    // Note: This requires the wallet to be properly initialized and have execution permissions
    for (uint256 i = 0; i < transactions.length; i++) {
      // Send ETH and call data to the wallet
      // The wallet should handle the execution internally
      (bool success, ) = wallet.call{value: transactions[i].value}(transactions[i].data);
      require(success, 'Transaction execution failed');
    }

    emit HybridWalletDeployed(wallet, salt, transactions.length);
    return wallet;
  }

  /**
   * Predict wallet address using CFA Factory
   */
  function computeWalletAddress(bytes calldata initData, bytes32 salt) external view returns (address payable) {
    return CFA_FACTORY.computeAccountAddress(initData, salt);
  }
}
