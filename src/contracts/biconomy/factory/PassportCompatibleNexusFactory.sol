// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

// ──────────────────────────────────────────────────────────────────────────────
//     _   __    _  __
//    / | / /__ | |/ /_  _______
//   /  |/ / _ \|   / / / / ___/
//  / /|  /  __/   / /_/ (__  )
// /_/ |_/\___/_/|_\__,_/____/
//
// ──────────────────────────────────────────────────────────────────────────────
// Nexus: A suite of contracts for Modular Smart Accounts compliant with ERC-7579 and ERC-4337, developed by Biconomy.
// Learn more at https://biconomy.io. To report security issues, please contact us at: security@biconomy.io

import {Stakeable} from '../common/Stakeable.sol';
import {INexusFactory} from '../interfaces/factory/INexusFactory.sol';
import {ProxyLib} from '../lib/ProxyLib.sol';

/// @title Passport Compatible Nexus Account Factory
/// @notice Factory that deploys Nexus accounts while maintaining CFA compatibility with old Passport factory
/// @dev Uses dual factory approach: old factory address for CFA calculation, new implementation for deployment
/// @author Immutable | Passport Team
contract PassportCompatibleNexusFactory is Stakeable, INexusFactory {
  /// @notice Address of the Nexus implementation contract used for new deployments.
  address public immutable NEXUS_IMPLEMENTATION;

  /// @notice Address of the old Passport factory used for CFA calculation to maintain address consistency.
  address public immutable OLD_PASSPORT_FACTORY;

  /// @notice Event emitted when a new Nexus account is created with Passport compatibility.
  /// @param account The address of the newly created account.
  /// @param implementation The implementation address used.
  /// @param salt The salt used for deterministic deployment.
  /// @param initData The initialization data used.
  event PassportCompatibleAccountCreated(
    address indexed account,
    address indexed implementation,
    bytes32 salt,
    bytes initData
  );

  /// @notice Constructor to set the Nexus implementation, old Passport factory address, and owner.
  /// @param nexusImplementation_ The address of the Nexus implementation for new deployments.
  /// @param oldPassportFactory_ The address of the old Passport factory for CFA compatibility.
  /// @param owner_ The address of the factory owner.
  constructor(address nexusImplementation_, address oldPassportFactory_, address owner_) Stakeable(owner_) {
    require(nexusImplementation_ != address(0), ImplementationAddressCanNotBeZero());
    require(oldPassportFactory_ != address(0), ZeroAddressNotAllowed());
    require(owner_ != address(0), ZeroAddressNotAllowed());

    NEXUS_IMPLEMENTATION = nexusImplementation_;
    OLD_PASSPORT_FACTORY = oldPassportFactory_;
  }

  /// @notice Creates a new Nexus account with Passport CFA compatibility.
  /// @param initData Initialization data to be called on the new Smart Account.
  /// @param salt Unique salt for the Smart Account creation.
  /// @return The address of the newly created Nexus account.
  function createAccount(bytes calldata initData, bytes32 salt) external payable override returns (address payable) {
    // Deploy the new Nexus account using current factory
    (bool alreadyDeployed, address payable account) = ProxyLib.deployProxy(NEXUS_IMPLEMENTATION, salt, initData);

    // Check if account was already deployed
    if (alreadyDeployed) {
      revert AccountAlreadyDeployed(account);
    }

    emit AccountCreated(account, initData, salt);
    emit PassportCompatibleAccountCreated(account, NEXUS_IMPLEMENTATION, salt, initData);

    return account;
  }

  /// @notice Computes the counterfactual address of a Smart Account using old Passport factory for compatibility.
  /// @param initData Initialization data to be called on the new Smart Account.
  /// @param salt Unique salt for the Smart Account creation.
  /// @return The address of the counterfactual Smart Account.
  function computeAccountAddress(
    bytes calldata initData,
    bytes32 salt
  ) external view override returns (address payable) {
    // Use old Passport factory address for CFA calculation to maintain compatibility
    return ProxyLib.predictProxyAddressWithFactory(NEXUS_IMPLEMENTATION, salt, initData, OLD_PASSPORT_FACTORY);
  }

  /// @notice Computes the counterfactual address using the current factory (for comparison/testing).
  /// @param initData Initialization data to be called on the new Smart Account.
  /// @param salt Unique salt for the Smart Account creation.
  /// @return The address of the counterfactual Smart Account using current factory.
  function computeAccountAddressWithCurrentFactory(
    bytes calldata initData,
    bytes32 salt
  ) external view returns (address payable) {
    // Use current factory address for CFA calculation
    return ProxyLib.predictProxyAddress(NEXUS_IMPLEMENTATION, salt, initData);
  }

  /// @notice Returns the addresses used by this factory for transparency.
  /// @return nexusImpl The Nexus implementation address used for deployments.
  /// @return oldFactory The old Passport factory address used for CFA calculations.
  function getFactoryAddresses() external view returns (address nexusImpl, address oldFactory) {
    return (NEXUS_IMPLEMENTATION, OLD_PASSPORT_FACTORY);
  }
}
