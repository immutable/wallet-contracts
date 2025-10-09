// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IModule } from "./IModule.sol";

/// @title Passport Wallet V2 - IExecutor Interface
/// @notice Defines the interface for Executor modules within the Nexus Smart Account framework, compliant with the ERC-7579 standard.
/// @dev Extends IModule to include functionalities specific to execution modules.
/// This interface is future-proof, allowing for expansion and integration of advanced features in subsequent versions.

/// This file has been adapted from the Nexus suite, which can be found at: https://github.com/rhinestonewtf/nexus/blob/main/contracts/modules/commons/interfaces/IExecutor.sol

interface IExecutor is IModule {
// Future methods for execution management will be defined here to accommodate evolving requirements.
}
