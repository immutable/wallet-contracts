// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Proxy} from '@openzeppelin/contracts/proxy/Proxy.sol';
import {ERC1967Proxy} from '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import {Initializable} from '../lib/Initializable.sol';

/// @title NexusProxy
/// @dev A proxy contract that uses the ERC1967 upgrade pattern and sets the initializable flag
///      in the constructor to prevent reinitialization
contract NexusProxy is ERC1967Proxy {
  constructor(address implementation, bytes memory data) payable ERC1967Proxy(implementation, data) {
    Initializable.setInitializable();
  }

  receive() external payable override {}
}
