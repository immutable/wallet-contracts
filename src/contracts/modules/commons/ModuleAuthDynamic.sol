// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./ModuleAuthUpgradable.sol";
import "./ImageHashKey.sol";
import "./ModuleStorage.sol";
import "./NonceKey.sol";
import "../../Wallet.sol";

import "../../utils/LibBytes.sol";

abstract contract ModuleAuthDynamic is ModuleAuthUpgradable {
  using LibBytes for bytes;

  bytes32 public immutable INIT_CODE_HASH;
  address public immutable FACTORY;
  address public immutable IMMUTABLE_SIGNER_CONTRACT;

constructor(address _factory, address _startupWalletImpl, address _immutableSignerContract) {
    // Build init code hash of the deployed wallets using that module
    bytes32 initCodeHash = keccak256(abi.encodePacked(Wallet.creationCode, uint256(uint160(_startupWalletImpl))));

    INIT_CODE_HASH = initCodeHash;
    FACTORY = _factory;
    IMMUTABLE_SIGNER_CONTRACT = _immutableSignerContract;
  }

  /**
   * @notice Verify if signer is default wallet owner
   * @param _hash       Hashed signed message
   * @param _signature  Array of signatures with signers ordered
   *                    like the the keys in the multisig configs
   *
   * @dev The signature must be solidity packed and contain the total number of owners,
   *      the threshold, the weight and either the address or a signature for each owner.
   *
   *      Each weight & (address or signature) pair is prefixed by a flag that signals if such pair
   *      contains an address or a signature. The aggregated weight of the signatures must surpass the threshold.
   *
   *      Flag types:
   *        0x00 - Signature
   *        0x01 - Address
   *
   *      E.g:
   *      abi.encodePacked(
   *        uint16 threshold,
   *        uint8 01,  uint8 weight_1, address signer_1,
   *        uint8 00, uint8 weight_2, bytes signature_2,
   *        ...
   *        uint8 01,  uint8 weight_5, address signer_5
   *      )
   */
  function _signatureValidation(
    bytes32 _hash,
    bytes memory _signature
  )
    internal virtual override returns (bool)
  {
    (bool verified, bool needsUpdate, bytes32 imageHash) = _signatureValidationWithUpdateCheck(_hash, _signature);
    if (needsUpdate) {
      updateImageHashInternal(imageHash);
    }
    return verified;
  }

  /**
   * @notice Verify signature and determine if image hash needs updating
   * @param _hash       Hashed signed message
   * @param _signature  Packed signature data containing threshold, flags, weights, and addresses/signatures
   * @return verified   True if the signature is valid and weight threshold is met
   * @return needsUpdate True if the image hash needs to be stored (first transaction)
   * @return imageHash  The computed image hash from the signature
   *
   * @dev This function parses the signature, recovers/reads signer addresses, and validates them.
   *      For defensive validation, each extracted address is compared against IMMUTABLE_SIGNER_CONTRACT.
   *      If a match is found, it is recorded.
   *      
   *      Special case: If this is the first transaction (nonce == 0) and the immutable signer contract
   *      is one of the signers, the signature is automatically validated and approved without checking
   *      the stored image hash. This allows the immutable signer to bootstrap the wallet on first use.
   */
  function _signatureValidationWithUpdateCheck(
    bytes32 _hash,
    bytes memory _signature
  )
    internal view override returns (bool, bool, bytes32)
  {
    (
      uint16 threshold,  // required threshold signature
      uint256 rindex     // read index
    ) = _signature.readFirstUint16();

    // Start image hash generation
    bytes32 imageHash = bytes32(uint256(threshold));

    // Acumulated weight of signatures
    uint256 totalWeight;

    // Track if immutable signer contract is one of the signers
    bool immutableSignerContractFound = false;

    // Iterate until the image is completed
    while (rindex < _signature.length) {
      // Read next item type and addrWeight
      uint256 flag; uint256 addrWeight; address addr;
      (flag, addrWeight, rindex) = _signature.readUint8Uint8(rindex);

      if (flag == FLAG_ADDRESS) {
        // Read plain address
        (addr, rindex) = _signature.readAddress(rindex);
      } else if (flag == FLAG_SIGNATURE) {
        // Read single signature and recover signer
        bytes memory signature;
        (signature, rindex) = _signature.readBytes66(rindex);
        addr = recoverSigner(_hash, signature);

        // Acumulate total weight of the signature
        totalWeight += addrWeight;
      } else if (flag == FLAG_DYNAMIC_SIGNATURE) {
        // Read signer
        (addr, rindex) = _signature.readAddress(rindex);

        // Read signature size
        uint256 size;
        (size, rindex) = _signature.readUint16(rindex);

        // Read dynamic size signature
        bytes memory signature;
        (signature, rindex) = _signature.readBytes(rindex, size);
        require(isValidSignature(_hash, addr, signature), "ModuleAuthDynamic#_signatureValidation: INVALID_SIGNATURE");

        // Acumulate total weight of the signature
        totalWeight += addrWeight;
      } else {
        revert("ModuleAuthDynamic#_signatureValidation INVALID_FLAG");
      }

      // Defensive check: compare extracted address with target address
      if (IMMUTABLE_SIGNER_CONTRACT != address(0) && addr == IMMUTABLE_SIGNER_CONTRACT) {
        immutableSignerContractFound = true;
      }

      // Write weight and address to image
      imageHash = keccak256(abi.encode(imageHash, addrWeight, addr));
    }

    // Check if this is the first transaction (nonce == 0) and immutable signer contract is one of the signers
    uint256 currentNonce = uint256(ModuleStorage.readBytes32Map(NonceKey.NONCE_KEY, bytes32(uint256(0))));
    if (currentNonce == 0 && immutableSignerContractFound) {
      return (true, true, imageHash);
    }

    (bool verified, bool needsUpdate) = _isValidImage(imageHash);
    return ((totalWeight >= threshold && verified), needsUpdate, imageHash);
  }

  /**
   * @notice Validates the signature image with the salt used to deploy the contract
   *         if there is no stored image hash. This will happen prior to the first meta 
   *         transaction. Subsequently, validate the 
   *         signature image with a valid image hash defined in the contract storage
   * @param _imageHash Hash image of signature
   * @return true if the signature image is valid, and true if the image hash needs to be updated
   */
  function _isValidImage(bytes32 _imageHash) internal view override returns (bool, bool) {
    bytes32 storedImageHash = ModuleStorage.readBytes32(ImageHashKey.IMAGE_HASH_KEY);
    if (storedImageHash == 0) {
      // No image hash stored. Check that the image hash was used as the salt when 
      // deploying the wallet proxy contract.
      bool authenticated = address(
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
      ) == address(this);
      // Indicate need to update = true. This will trigger a call to store the image hash
      return (authenticated, true);
    }

    // Image hash has been stored. 
    return ((_imageHash != bytes32(0) && _imageHash == storedImageHash), false);
  }
}



