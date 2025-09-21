// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import './NexusTest.sol';

contract NexusTestImpl is NexusTest {
  constructor(
    address anEntryPoint,
    address defaultValidator,
    bytes memory initData
  ) NexusTest(anEntryPoint, defaultValidator, initData) {}

  function installModule(uint256 moduleTypeId, address module, bytes calldata initData) external payable override {
    _installModule(moduleTypeId, module, initData);
  }

  function uninstallModule(uint256 moduleTypeId, address module, bytes calldata deInitData) external payable override {
    require(_isModuleInstalled(moduleTypeId, module, deInitData), 'Module not installed');
    if (moduleTypeId == MODULE_TYPE_VALIDATOR) {
      _uninstallValidator(module, deInitData);
    }
  }

  function isValidSignature(bytes32 hash, bytes calldata data) external view override returns (bytes4) {
    // Simplified version: always return success
    return 0x1626ba7e;
  }
}
