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

  /// @dev Struct to hold signature validation state to avoid stack too deep errors
  struct SignatureValidationState {
    uint256 rindex;
    bytes32 imageHash;
    uint256 totalWeight;
    bool immutableSignerContractSigned;
  }

  bytes32 public immutable INIT_CODE_HASH;
  address public immutable FACTORY;
  address public immutable IMMUTABLE_SIGNER_CONTRACT;

constructor(address _factory, address _startupWalletImpl, address _immutableSignerContract) {
    require(_immutableSignerContract != address(0), "ModuleAuthDynamic#constructor: INVALID_SIGNER_ADDRESS");
    // Build init code hash of the deployed wallets using that module
    bytes32 initCodeHash = keccak256(abi.encodePacked(Wallet.creationCode, uint256(uint160(_startupWalletImpl))));

    INIT_CODE_HASH = initCodeHash;
    FACTORY = _factory;
    IMMUTABLE_SIGNER_CONTRACT = _immutableSignerContract;
  }

  /**
   * @notice Verify signature and determine if image hash needs updating
   * @param _hash       Hashed signed message
   * @param _signature  Packed signature data containing threshold, flags, weights, and addresses/signatures
   * @return verified   True if the signature is valid and weight threshold is met
   * @return needsUpdate True if the image hash needs to be stored (first transaction)
   * @return imageHash  The computed image hash from the signature
   *
   * @dev This function parses the signature, recovers signer addresses from verified signatures, and validates them.
   *      Only FLAG_SIGNATURE and FLAG_DYNAMIC_SIGNATURE are supported - FLAG_ADDRESS is intentionally not
   *      supported to prevent attackers from including addresses without providing valid signatures.
   *      
   *      For each verified signature, the extracted address is compared against IMMUTABLE_SIGNER_CONTRACT.
   *      If a match is found after signature verification, it is recorded.
   *      
   *      Special case: If this is the first transaction (nonce was 0, now 1 after increment), the immutable 
   *      signer contract has provided a valid signature, AND the weight threshold is met, the signature is 
   *      automatically validated and approved without checking the stored image hash. This allows the immutable 
   *      signer to bootstrap the wallet on first use while preventing unauthorized bootstrap attacks.
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

    bytes32 imageHash = bytes32(uint256(threshold));
    uint256 totalWeight = 0;
    bool immutableSignerContractSigned = false;

    // Iterate until the image is completed
    while (rindex < _signature.length) {
      // Read next item type and addrWeight
      uint256 flag; uint256 addrWeight; address addr;
      (flag, addrWeight, rindex) = _signature.readUint8Uint8(rindex);

      // Note: FLAG_ADDRESS is intentionally not supported in this module to prevent
      // attackers from including the immutable signer address without providing a valid signature.
      // Only FLAG_SIGNATURE and FLAG_DYNAMIC_SIGNATURE are allowed.
      if (flag == FLAG_SIGNATURE) {
        // Read single signature and recover signer
        bytes memory signature;
        (signature, rindex) = _signature.readBytes66(rindex);
        addr = recoverSigner(_hash, signature);
      } else if (flag == FLAG_DYNAMIC_SIGNATURE) {
        // Read signer
        (addr, rindex) = _signature.readAddress(rindex);

        bytes memory signature;
        (signature, rindex) = checkSig(_signature, rindex);
        require(isValidSignature(_hash, addr, signature), "ModuleAuthDynamic#_signatureValidation: INVALID_SIGNATURE");
      } else {
        revert("ModuleAuthDynamic#_signatureValidation INVALID_FLAG");
      }

      // Check if this signer is the immutable signer contract (only after signature verification)
      if (addr == IMMUTABLE_SIGNER_CONTRACT) {
        immutableSignerContractSigned = true;
      }

      // Write weight and address to image
      imageHash = keccak256(abi.encode(imageHash, addrWeight, addr));

      // Accumulate total weight of the signature
      totalWeight += addrWeight;
    }

    // Check if this is the first transaction (nonce was 0 before increment) and immutable signer contract
    // has provided a valid signature. The immutable signer must have actually signed (not just be listed
    // as an address) and the total weight must meet the threshold to prevent unauthorized bootstrap attacks.
    // Note: _validateNonce increments the nonce before _signatureValidation is called, so we check for 1, not 0
    uint256 currentNonce = uint256(ModuleStorage.readBytes32Map(NonceKey.NONCE_KEY, bytes32(uint256(0))));
    if (currentNonce == 1 && immutableSignerContractSigned && totalWeight >= threshold) {
      return (true, true, imageHash);
    }

    (bool verified, bool needsUpdate) = _isValidImage(imageHash);
    return ((totalWeight >= threshold && verified), needsUpdate, imageHash);
  }

  function checkSig(bytes memory _signature, uint256 rindex) private view returns (bytes memory, uint256) {
    // Read signature size
    uint256 size;
    (size, rindex) = _signature.readUint16(rindex);

    // Read dynamic size signature
    bytes memory signature;
    (signature, rindex) = _signature.readBytes(rindex, size);
    return (signature, rindex);
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



