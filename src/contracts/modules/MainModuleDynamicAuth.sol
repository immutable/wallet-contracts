// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./commons/ModuleAuthDynamic.sol";
import "./commons/ModuleReceivers.sol";
import "./commons/ModuleCalls.sol";
import "./commons/ModuleUpdate.sol";
import "../interfaces/erc4337/IAccount.sol";


/**
 * TODO Peter update docs
 * @notice Contains the core functionality arcadeum wallets will inherit with
 *         the added functionality that the main-module can be changed.
 * @dev If using a new main module, developpers must ensure that all inherited
 *      contracts by the mainmodule don't conflict and are accounted for to be
 *      supported by the supportsInterface method.
 */
contract MainModuleDynamicAuth is
  ModuleAuthDynamic,
  ModuleCalls,
  ModuleReceivers,
  ModuleUpdate,
  IAccount
{

  // solhint-disable-next-line no-empty-blocks
  constructor(address _factory, address _startup) ModuleAuthDynamic (_factory, _startup) { }


  /**
   * @notice Query if a contract implements an interface
   * @param _interfaceID The interface identifier, as specified in ERC-165
   * @dev If using a new main module, developpers must ensure that all inherited
   *      contracts by the mainmodule don't conflict and are accounted for to be
   *      supported by the supportsInterface method.
   * @return `true` if the contract implements `_interfaceID`
   */
  function supportsInterface(
    bytes4 _interfaceID
  ) public override(
    ModuleAuthUpgradable,
    ModuleCalls,
    ModuleReceivers,
    ModuleUpdate
  ) pure returns (bool) {
    if (_interfaceID == type(IAccount).interfaceId) {
        return true;
    }
    return super.supportsInterface(_interfaceID);
  }

  function validateUserOp(
      UserOperation calldata userOp,
      bytes32 userOpHash,
      uint256 missingAccountFunds
  ) external override returns (uint256 validationData) {
      // Check if there are missing funds. 
      // This is a basic check, a full implementation would require more logic.
      if (missingAccountFunds > 0) {
          revert("Not enough funds to cover transaction costs");
      }

      // Use the existing internal signature validation function.
      // The nonce from the userOp is part of the userOpHash.
      // Per ERC-4337, return 1 on signature failure. This is interpreted by the
      // EntryPoint as a packed value where the `authorizer` field is 1, and the
      // timestamp fields are 0.
      if (!_signatureValidation(userOpHash, userOp.signature)) {
          return 1;
      }

      // Return 0 for a standard signature validation. This is interpreted by the
      // EntryPoint as a packed value where the `authorizer`, `validUntil`, and
      // `validAfter` fields are all 0.
      return 0;
  }

  function version() external pure virtual returns (uint256) {
    return 1;
  }
}
