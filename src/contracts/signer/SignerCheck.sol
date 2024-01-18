// Copyright Immutable Pty Ltd 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {SignatureValidator} from '../utils/SignatureValidator.sol';
import "hardhat/console.sol";

contract SignerCheck is SignatureValidator {
  function recover(bytes32 _hash, bytes memory _signature) public view returns (address) {
    console.log("SIGNER CHECK");
    return recoverSigner(_hash, _signature);
  }
}
