// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./ModuleAuth.sol";
import "../../Wallet.sol";

/**
 *  Implements ModuleAuth by validating the signature image against
 *  the salt used to deploy the contract
 *
 *  This module allows wallets to be deployed with a default configuration
 *  without using any aditional contract storage
 */
abstract contract ModuleAuthFixed is ModuleAuth {
  bytes32 public immutable INIT_CODE_HASH;
  address public immutable FACTORY;

  constructor(address _factory) {
    // Build init code hash of the deployed wallets using that module
    bytes32 initCodeHash = keccak256(abi.encodePacked(Wallet.creationCode, uint256(uint160(address(this)))));

    INIT_CODE_HASH = initCodeHash;
    FACTORY = _factory;
  }

  /**
   * @notice Validates the signature image with the salt used to deploy the contract
   * @param _imageHash Hash image of signature
   * @return true if the signature image is valid, and always false, indicating no updates required
   */
  function _isValidImage(bytes32 _imageHash) internal view override returns (bool, bool) {
    return ((address(
      uint160(uint256(
        keccak256(
          abi.encodePacked(
            bytes1(0xff),
            FACTORY,
            _imageHash,
            INIT_CODE_HASH
          )
        )
      ))
    ) == address(this)), false);
  }
}
