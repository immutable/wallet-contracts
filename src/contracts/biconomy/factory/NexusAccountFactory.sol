// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import '../Nexus.sol';
import '../interfaces/factory/INexusFactory.sol';
import '../lib/ProxyLib.sol';

contract NexusAccountFactory is INexusFactory {
  address public immutable implementation;
  address public immutable entryPoint;

  constructor(address _implementation, address _entryPoint) {
    require(_implementation != address(0), 'Invalid implementation');
    require(_entryPoint != address(0), 'Invalid entryPoint');
    implementation = _implementation;
    entryPoint = _entryPoint;
  }

  function getAddress(bytes calldata initData, bytes32 salt) public view returns (address) {
    bytes memory creationCode = type(Nexus).creationCode;
    bytes memory constructorArgs = abi.encode(entryPoint, implementation, initData);
    bytes32 bytecodeHash = keccak256(abi.encodePacked(creationCode, constructorArgs));

    bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, bytecodeHash));

    return address(uint160(uint(hash)));
  }

  function createAccount(bytes calldata initData, bytes32 salt) external payable returns (address payable) {
    address addr = getAddress(initData, salt);
    uint codeSize = addr.code.length;
    if (codeSize > 0) {
      return payable(addr);
    }

    address proxy = address(new Nexus{salt: salt}(entryPoint, implementation, initData));
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
}
