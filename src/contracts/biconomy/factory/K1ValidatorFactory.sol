// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import '../modules/K1Validator.sol';
import '../interfaces/modules/IModule.sol';

contract K1ValidatorFactory {
  address public immutable implementation;

  constructor(address _implementation) {
    require(_implementation != address(0), 'Invalid implementation');
    implementation = _implementation;
  }

  function createValidator(bytes memory initData) external returns (address) {
    // Deploy a new proxy pointing to the implementation
    address proxy = address(new K1Validator());

    // Initialize the validator
    if (initData.length > 0) {
      IModule(proxy).onInstall(initData);
    }

    return proxy;
  }
}
