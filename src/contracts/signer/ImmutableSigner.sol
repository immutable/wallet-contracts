// Copyright Immutable Pty Ltd 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {SignatureValidator} from '../utils/SignatureValidator.sol';
import {AccessControl} from '@openzeppelin/contracts/access/AccessControl.sol';

/**
 * TODO: Add documentation and follow the documentation standards.
 */
contract ImmutableSigner is SignatureValidator, AccessControl {
  address public signer;

  // FIXME: is there a better name for this role?
  bytes32 public constant SIGNER_ADMIN = keccak256('SIGNER_ADMIN');

  // TODO: initialize the signer?
  constructor(address _signerAdmin, address _signer) {
    _grantRole(SIGNER_ADMIN, _signerAdmin);
    signer = _signer;
  }

  function updateSigner(address _newSigner) public onlyRole(SIGNER_ADMIN) {
    signer = _newSigner;
  }

  function isValidSignature(bytes32 _hash, bytes memory _signature) public view returns (bytes4) {
    if (recoverSigner(_hash, _signature) == signer) {
      return ERC1271_MAGICVALUE_BYTES32;
    }

    return 0;
  }
}
