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
import {Nexus} from '../Nexus.sol';
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

  /// @notice Constructor to set the smart account implementation address and the factory owner.
  /// @param implementation_ The address of the Nexus implementation to be used for all deployments.
  /// @param owner_ The address of the owner of the factory.
  constructor(address implementation_, address owner_) Stakeable(owner_) {
    require(implementation_ != address(0), ImplementationAddressCanNotBeZero());
    require(owner_ != address(0), ZeroAddressNotAllowed());
    ACCOUNT_IMPLEMENTATION = implementation_;
  }

  /// @notice Creates a new Nexus account using direct Nexus deployment
  /// @dev Uses direct Nexus deployment with configurable EntryPoint and Validator
  /// @param initData Initialization data containing [entryPoint, validator, owner] addresses
  /// @param salt Unique salt for the Smart Account creation.
  /// @return The address of the newly created Nexus account.
  function createAccount(bytes calldata initData, bytes32 salt) external payable override returns (address payable) {
    // Extract addresses from initData: [entryPoint, validator, owner]
    require(initData.length >= 96, 'NexusAccountFactory: initData too short'); // 3 addresses = 96 bytes

    address entryPoint;
    address validator;
    address owner;

    assembly {
      entryPoint := calldataload(add(initData.offset, 0x00)) // First 32 bytes
      validator := calldataload(add(initData.offset, 0x20)) // Second 32 bytes
      owner := calldataload(add(initData.offset, 0x40)) // Third 32 bytes
    }

    // Deploy Nexus directly with CREATE2 (using provided parameters)
    // FIXED: Pass owner data to constructor to satisfy K1Validator.onInstall requirement
    // K1Validator.onInstall requires non-empty data (owner address)
    bytes memory validatorInitData = abi.encodePacked(owner);
    Nexus nexus = new Nexus{salt: salt}(entryPoint, validator, validatorInitData);

    address payable deployedAddress = payable(address(nexus));

    // NOTE: K1Validator is now automatically initialized in Nexus constructor
    // via ModuleManager(validator, validatorInitData) -> validator.onInstall(validatorInitData)
    // No manual initialization needed

    // emit event
    emit AccountCreated(deployedAddress, initData, salt);

    return deployedAddress;
  }

  /// @notice Computes the expected address of a Nexus contract using the SAME logic as createAccount
  /// @dev Uses Nexus.creationCode to match the actual deployment in createAccount
  /// @param initData - Initialization data containing [entryPoint, validator, owner] addresses
  /// @param salt - Unique salt for the Smart Account creation.
  /// @return expectedAddress The expected address at which the Nexus contract will be deployed if the provided parameters are used.
  function computeAccountAddress(
    bytes calldata initData,
    bytes32 salt
  ) external view override returns (address payable expectedAddress) {
    // Extract addresses from initData: [entryPoint, validator, owner] (same as createAccount)
    require(initData.length >= 96, 'NexusAccountFactory: initData too short');

    address entryPoint;
    address validator;
    address owner;

    assembly {
      entryPoint := calldataload(add(initData.offset, 0x00)) // First 32 bytes
      validator := calldataload(add(initData.offset, 0x20)) // Second 32 bytes
      owner := calldataload(add(initData.offset, 0x40)) // Third 32 bytes
    }

    // Use the SAME initCodeHash as createAccount (Nexus.creationCode)
    // FIXED: Must match createAccount - using owner data in constructor
    bytes memory validatorInitData = abi.encodePacked(owner);
    bytes32 initCodeHash = keccak256(
      abi.encodePacked(type(Nexus).creationCode, abi.encode(entryPoint, validator, validatorInitData))
    );

    bytes32 _hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash));

    expectedAddress = payable(address(uint160(uint256(_hash))));
  }
}
