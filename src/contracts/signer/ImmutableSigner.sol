// Copyright Immutable Pty Ltd 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {SignatureValidator} from '../utils/SignatureValidator.sol';
import {AccessControl} from '@openzeppelin/contracts/access/AccessControl.sol';

/**
 * @title ImmutableSigner
 *
 * @notice ERC-1271 Wallet implementation. Verifies signatures using a public
 * key in storage matching an offchain private key. The key can be upgraded by
 * the role SIGNER_ADMIN, set during initialization.
 */
contract ImmutableSigner is SignatureValidator, AccessControl {
  address public signer;

  bytes32 public constant SIGNER_ADMIN = keccak256('SIGNER_ADMIN');

  constructor(address _rootAdmin, address _signerAdmin, address _signer) {
    _grantRole(DEFAULT_ADMIN_ROLE, _rootAdmin);
    _grantRole(SIGNER_ADMIN, _signerAdmin);
    signer = _signer;
  }

  /*
   * @dev Updates the authorized public key address
   * @param _newSigner The address of the new authorized signer.
   */
  function updateSigner(address _newSigner) public onlyRole(SIGNER_ADMIN) {
    signer = _newSigner;
  }

  /**
   * @notice Verifies whether the provided signature is valid with respect to the provided hash
   * @dev MUST return the correct magic value if the signature provided is valid for the provided hash
   *   > The bytes4 magic value to return when signature is valid is 0x1626ba7e
   * @param _hash       keccak256 hash that was signed
   * @param _signature  Signature byte array associated with _data
   * @return magicValue Magic value 0x1626ba7e if the signature is valid and 0x0 otherwise
   */
  function isValidSignature(bytes32 _hash, bytes memory _signature) external view returns (bytes4) {
    if (recoverSigner(_hash, _signature) == signer) {
      return ERC1271_MAGICVALUE_BYTES32;
    }

    return 0;
  }
}
