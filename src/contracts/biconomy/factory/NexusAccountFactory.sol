// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import '../Nexus.sol';
import '../interfaces/factory/INexusFactory.sol';
import '../lib/ProxyLib.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract NexusAccountFactory is INexusFactory, AccessControl {
  // Role to deploy new wallets (same as in Passport's Factory)
  bytes32 public constant DEPLOYER_ROLE = keccak256('DEPLOYER_ROLE');

  address public immutable implementation;
  address public immutable entryPoint;

  event WalletDeployed(address indexed wallet, bytes indexed initData, bytes32 indexed salt);

  constructor(address _implementation, address _entryPoint) {
    require(_implementation != address(0), 'Invalid implementation');
    require(_entryPoint != address(0), 'Invalid entryPoint');
    implementation = _implementation;
    entryPoint = _entryPoint;

    // Grant deployer role to contract deployer
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(DEPLOYER_ROLE, msg.sender);
  }

  function getAddress(bytes calldata initData, bytes32 salt) public view returns (address) {
    bytes memory creationCode = type(Nexus).creationCode;
    bytes memory constructorArgs = abi.encode(entryPoint, implementation, initData);
    bytes32 bytecodeHash = keccak256(abi.encodePacked(creationCode, constructorArgs));

    bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, bytecodeHash));

    return address(uint160(uint(hash)));
  }

  /**
   * @notice Creates a new Nexus wallet instance. This method is analogous to the deploy() method
   * in the original Passport Factory, but with additional account existence check.
   * @dev Uses CREATE2 opcode implicitly through Solidity's `new Contract{salt: salt}()` syntax
   * at the proxy deployment.
   * @param initData Initialization data for the new wallet
   * @param salt Unique salt for deterministic address generation
   * @return The address of the newly created or existing wallet
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

    address proxy = address(new Nexus{salt: salt}(entryPoint, implementation, initData));

    // Emit event after successful deployment (same pattern as Passport)
    emit WalletDeployed(proxy, initData, salt);

    return payable(proxy);
  }

  function computeAccountAddress(
    bytes calldata initData,
    bytes32 salt
  ) external view returns (address payable expectedAddress) {
    bytes memory creationCode = type(Nexus).creationCode;
    bytes memory constructorArgs = abi.encode(entryPoint, implementation, initData);
    bytes32 bytecodeHash = keccak256(abi.encodePacked(creationCode, constructorArgs));

    bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, bytecodeHash));

    return payable(address(uint160(uint(hash))));
  }

  // AccessControl's supportsInterface
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
