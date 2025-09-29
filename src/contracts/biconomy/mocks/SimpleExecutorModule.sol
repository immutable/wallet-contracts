// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import '../interfaces/modules/IModule.sol';

/**
 * @title SimpleExecutorModule
 * @notice A minimal executor module for testing/initialization purposes
 * @dev This module allows any address to execute calls (for initialization only)
 */
contract SimpleExecutorModule is IModule {
  /**
   * @notice Returns the type of the module
   * @param typeID The type ID to check
   * @return True if this module supports the EXECUTOR type
   */
  function isModuleType(uint256 typeID) external pure override returns (bool) {
    // MODULE_TYPE_EXECUTOR = 2
    return typeID == 2;
  }

  /**
   * @notice Initialization function called when module is installed
   * @param data Initialization data (unused in this simple implementation)
   */
  function onInstall(bytes calldata data) external override {
    // Simple executor - no special initialization needed
    // In production, you would validate the installing account, etc.
  }

  /**
   * @notice De-initialization function called when module is uninstalled
   * @param data De-initialization data (unused in this simple implementation)
   */
  function onUninstall(bytes calldata data) external override {
    // Simple cleanup - no special de-initialization needed
  }

  /**
   * @notice Check if the module is initialized for a specific account
   * @param smartAccount The smart account to check
   * @return True if initialized (always true for this simple module)
   */
  function isInitialized(address smartAccount) external pure override returns (bool) {
    // For this simple module, always return true once installed
    return true;
  }

  /**
   * @notice Returns module name and version
   * @return name The name of the module
   */
  function name() external pure returns (string memory) {
    return 'SimpleExecutorModule';
  }

  /**
   * @notice Returns module version
   * @return version The version of the module
   */
  function version() external pure returns (string memory) {
    return '1.0.0';
  }
}
