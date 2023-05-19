// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;


contract AlwaysRevertMock {
  fallback() external payable {
    revert("AlwaysRevertMock#fallback: ALWAYS_REVERT");
  }
}
