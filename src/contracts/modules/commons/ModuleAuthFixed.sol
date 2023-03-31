// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;

import './ModuleAuth.sol';

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

  bytes internal constant creationCode =
    hex'608060405234801561001057600080fd5b506040516101e03803806101e08339818101604052810190610032919061009e565b803055506100cb565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061006b82610040565b9050919050565b61007b81610060565b811461008657600080fd5b50565b60008151905061009881610072565b92915050565b6000602082840312156100b4576100b361003b565b5b60006100c284828501610089565b91505092915050565b610106806100da6000396000f3fe608060405260043610601f5760003560e01c80639061112714604b576025565b36602557005b366000803760008036600030545af43d6000803e80600081146046573d6000f35b3d6000fd5b348015605657600080fd5b50605d6071565b6040516068919060b7565b60405180910390f35b60003054905090565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600060a382607a565b9050919050565b60b181609a565b82525050565b600060208201905060ca600083018460aa565b9291505056fea264697066735822122074fe0440d390429dff5a892d64613758f7c145bfd7856e0ab26b6c7d42efe80764736f6c63430008110033';

  constructor(address _factory) {
    // Build init code hash of the deployed wallets using that module
    bytes32 initCodeHash = keccak256(abi.encodePacked(creationCode, uint256(address(this))));

    INIT_CODE_HASH = initCodeHash;
    FACTORY = _factory;
  }

  /**
   * @notice Validates the signature image with the salt used to deploy the contract
   * @param _imageHash Hash image of signature
   * @return true if the signature image is valid
   */
  function _isValidImage(bytes32 _imageHash) internal view override returns (bool) {
    return address(uint256(keccak256(abi.encodePacked(bytes1(0xff), FACTORY, _imageHash, INIT_CODE_HASH)))) == address(this);
  }
}
