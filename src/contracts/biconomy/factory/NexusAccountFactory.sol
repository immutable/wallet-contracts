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
import {NexusBootstrap} from '../utils/NexusBootstrap.sol';
import '../../Wallet.sol';

/// @title Nexus Account Factory
/// @notice Manages the creation of Modular Smart Accounts compliant with ERC-7579 and ERC-4337 using a factory pattern.
/// @author @livingrockrises | Biconomy | chirag@biconomy.io
/// @author @aboudjem | Biconomy | adam.boudjemaa@biconomy.io
/// @author @filmakarov | Biconomy | filipp.makarov@biconomy.io
/// @author @zeroknots | Rhinestone.wtf | zeroknots.eth
/// Special thanks to the Solady team for foundational contributions: https://github.com/Vectorized/solady
contract NexusAccountFactory is Stakeable, INexusFactory {
  /// @notice Address of the implementation contract used to create new Nexus instances.
  /// @dev This address is immutable and set upon deployment, ensuring the implementation cannot be changed.
  address public immutable ACCOUNT_IMPLEMENTATION;

  /// @notice Address of the NexusBootstrap contract for module initialization
  /// @dev This address is immutable and set upon deployment
  address public immutable NEXUS_BOOTSTRAP;

  /// @notice Event emitted when a wallet is deployed (Factory.sol compatibility)
  event WalletDeployed(address indexed wallet, address indexed mainModule, bytes32 salt);

  /// @notice Constructor to set the smart account implementation address and the factory owner.
  /// @param implementation_ The address of the Nexus implementation to be used for all deployments.
  /// @param owner_ The address of the owner of the factory.
  /// @param nexusBootstrap_ The address of the NexusBootstrap contract.
  constructor(address implementation_, address owner_, address nexusBootstrap_) Stakeable(owner_) {
    require(implementation_ != address(0), ImplementationAddressCanNotBeZero());
    require(owner_ != address(0), ZeroAddressNotAllowed());
    require(nexusBootstrap_ != address(0), ZeroAddressNotAllowed());
    ACCOUNT_IMPLEMENTATION = implementation_;
    NEXUS_BOOTSTRAP = nexusBootstrap_;
  }

  /// @notice Creates a new Nexus account with CFA compatibility (same signature as Factory.sol)
  /// @dev Uses WalletProxy.yul for CFA compatibility, identical to legacy Factory pattern
  /// @param _mainModule Address of the main module to be used by the wallet (Nexus implementation)
  /// @param salt Unique salt for the Smart Account creation.
  /// @return _contract The address of the newly created Nexus account.
  function createAccount(
    address _mainModule,
    bytes32 salt
  ) external payable override returns (address payable _contract) {
    // Deploy WalletProxy.yul for CFA compatibility (identical to Factory.sol)
    bytes memory code = abi.encodePacked(Wallet.creationCode, uint256(uint160(_mainModule)));
    assembly {
      _contract := create2(callvalue(), add(code, 32), mload(code), salt)
    }
    // check deployment success
    require(_contract != address(0), 'WalletFactory: deployment failed');

    // Following official Biconomy pattern: Deploy wallet WITHOUT initialization
    // Initialization must be done via first UserOp calling initializeAccount()
    // This maintains CFA compatibility and follows the official ERC-4337 pattern

    // emit event, increases gas cost by ~2k
    emit WalletDeployed(_contract, _mainModule, salt);

    return payable(_contract);
  }

  /// @notice Computes the expected address of a Nexus contract using the SAME logic as createAccount
  /// @dev Uses identical pattern to Factory.sol for perfect CFA compatibility
  /// @param _mainModule Address of the main module to be used by the wallet (Nexus implementation)
  /// @param salt Unique salt for the Smart Account creation.
  /// @return expectedAddress The expected address at which the Nexus contract will be deployed if the provided parameters are used.
  function computeAccountAddress(
    address _mainModule,
    bytes32 salt
  ) external view override returns (address payable expectedAddress) {
    // Use the SAME pattern as Factory.sol for perfect CFA compatibility
    bytes32 _hash = keccak256(
      abi.encodePacked(
        bytes1(0xff),
        address(this),
        salt,
        keccak256(abi.encodePacked(Wallet.creationCode, uint256(uint160(_mainModule))))
      )
    );
    return payable(address(uint160(uint256(_hash))));
  }
}
