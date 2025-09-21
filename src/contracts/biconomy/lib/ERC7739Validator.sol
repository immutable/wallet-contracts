// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ECDSA} from 'solady/utils/ECDSA.sol';

abstract contract ERC7739Validator {
  using ECDSA for bytes32;

  bytes4 internal constant EIP1271_SUCCESS = 0x1626ba7e;
  bytes4 internal constant EIP1271_FAILED = 0xffffffff;

  function _erc1271UnwrapSignature(bytes calldata signature) internal pure returns (bytes calldata) {
    return signature;
  }

  function _erc1271IsValidSignatureWithSender(
    address sender,
    bytes32 hash,
    bytes calldata signature
  ) internal view virtual returns (bytes4) {
    if (_erc1271CallerIsSafe(sender)) {
      return _erc1271IsValidSignatureNowCalldata(hash, signature) ? EIP1271_SUCCESS : EIP1271_FAILED;
    }
    return
      _erc1271IsValidSignatureNowCalldata(hash.toEthSignedMessageHash(), signature) ? EIP1271_SUCCESS : EIP1271_FAILED;
  }

  function _erc1271IsValidSignatureNowCalldata(
    bytes32 hash,
    bytes calldata signature
  ) internal view virtual returns (bool);

  function _erc1271CallerIsSafe(address sender) internal view virtual returns (bool);
}
