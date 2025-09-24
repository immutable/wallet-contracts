// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import '@openzeppelin/contracts/access/AccessControl.sol';

/**
 * @title MinimalNexus
 * @notice Minimal version of Nexus just for testing factory deployment
 */
contract MinimalNexus {
  address public immutable entryPoint;
  address public immutable implementation;
  bytes public initData;

  constructor(address _entryPoint, address _implementation, bytes memory _initData) {
    entryPoint = _entryPoint;
    implementation = _implementation;
    initData = _initData;
  }
}

/**
 * @title NexusAccountFactoryTest
 * @notice Simplified version of NexusAccountFactory for testing purposes
 * @dev Analogous to Passport's Factory.deploy() but uses Nexus's createAccount pattern
 */
contract NexusAccountFactoryTest is AccessControl {
  bytes32 public constant DEPLOYER_ROLE = keccak256('DEPLOYER_ROLE');

  address public immutable entryPoint;
  address public immutable implementation;

  event WalletDeployed(address indexed wallet, bytes initData, bytes32 salt);

  constructor(address admin, address _implementation) {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(DEPLOYER_ROLE, msg.sender);

    // Hardcoded for testing
    entryPoint = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    implementation = _implementation;
  }

  /**
   * @notice Creates a new Nexus account
   * @dev Analogous to Passport's Factory.deploy()
   * @param initData Initialization data for the account
   * @param salt Unique salt for CREATE2
   * @return The address of the deployed account
   */
  function createAccount(
    bytes calldata initData,
    bytes32 salt
  ) external payable onlyRole(DEPLOYER_ROLE) returns (address payable) {
    address addr = getAddress(initData, salt);
    uint codeSize = addr.code.length;
    if (codeSize > 0) {
      return payable(addr);
    }

    address proxy = address(new MinimalNexus{salt: salt}(entryPoint, implementation, initData));

    emit WalletDeployed(proxy, initData, salt);
    return payable(proxy);
  }

  /**
   * @notice Gets the deterministic address for an account
   * @param initData Initialization data for the account
   * @param salt Unique salt for CREATE2
   * @return The computed address
   */
  function getAddress(bytes calldata initData, bytes32 salt) public view returns (address) {
    bytes memory creationCode = type(MinimalNexus).creationCode;
    bytes memory initCodePacked = abi.encodePacked(creationCode, abi.encode(entryPoint, implementation, initData));
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(initCodePacked)));
    return address(uint160(uint(hash)));
  }
}
