// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library LibEIP7702 {
  bytes32 constant EIP7702_PROXY_DELEGATION_INITIALIZATION_REQUEST_SLOT =
    bytes32(uint256(keccak256('eip7702.proxy.delegation.initialization.request')) - 1);

  function delegation(address target) internal view returns (address) {
    bytes32 slot = EIP7702_PROXY_DELEGATION_INITIALIZATION_REQUEST_SLOT;
    assembly {
      target := tload(slot)
    }
    return target;
  }
}
