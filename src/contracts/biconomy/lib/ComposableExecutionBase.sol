// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

struct ComposableExecution {
  address to;
  uint256 value;
  bytes data;
}

abstract contract ComposableExecutionBase {
  function _executeComposable(ComposableExecution[] calldata executions) internal virtual {
    uint256 length = executions.length;
    for (uint256 i = 0; i < length; i++) {
      _executeAction(executions[i].to, executions[i].value, executions[i].data);
    }
  }

  function _executeAction(address to, uint256 value, bytes memory data) internal virtual returns (bytes memory);
}
