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
    bool immutableSignerContractFound;
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
   * @dev This function parses the signature, recovers/reads signer addresses, and validates them.
   *      For defensive validation, each extracted address is compared against IMMUTABLE_SIGNER_CONTRACT.
   *      If a match is found, it is recorded.
   *      
   *      Special case: If this is the first transaction (nonce was 0, now 1 after increment) and the immutable 
   *      signer contract is one of the signers, the signature is automatically validated and approved without 
   *      checking the stored image hash. This allows the immutable signer to bootstrap the wallet on first use.
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

    SignatureValidationState memory state = SignatureValidationState({
      rindex: rindex,
      imageHash: bytes32(uint256(threshold)),
      totalWeight: 0,
      immutableSignerContractFound: false
    });

    // Iterate until the image is completed
    while (state.rindex < _signature.length) {
      // Read next item type and addrWeight
      uint256 flag; uint256 addrWeight; address addr;
      (flag, addrWeight, state.rindex) = _signature.readUint8Uint8(state.rindex);

      if (flag == FLAG_ADDRESS) {
        // Read plain address
        (addr, state.rindex) = _signature.readAddress(state.rindex);
      } else if (flag == FLAG_SIGNATURE) {
        // Read single signature and recover signer
        bytes memory signature;
        (signature, state.rindex) = _signature.readBytes66(state.rindex);
        addr = recoverSigner(_hash, signature);

        // Acumulate total weight of the signature
        state.totalWeight += addrWeight;
      } else if (flag == FLAG_DYNAMIC_SIGNATURE) {
        // Read signer
        (addr, state.rindex) = _signature.readAddress(state.rindex);

        // Read signature size
        uint256 size;
        (size, state.rindex) = _signature.readUint16(state.rindex);

        // Read dynamic size signature
        bytes memory signature;
        (signature, state.rindex) = _signature.readBytes(state.rindex, size);
        require(isValidSignature(_hash, addr, signature), "ModuleAuthDynamic#_signatureValidation: INVALID_SIGNATURE");

        // Acumulate total weight of the signature
        state.totalWeight += addrWeight;
      } else {
        revert("ModuleAuthDynamic#_signatureValidation INVALID_FLAG");
      }

      // Check if this signer is the immutable signer contract
      if (addr == IMMUTABLE_SIGNER_CONTRACT) {
        state.immutableSignerContractFound = true;
      }

      // Write weight and address to image
      state.imageHash = keccak256(abi.encode(state.imageHash, addrWeight, addr));
    }

    // Check if this is the first transaction (nonce was 0 before increment) and immutable signer contract is one of the signers
    // Note: _validateNonce increments the nonce before _signatureValidation is called, so we check for 1, not 0
    uint256 currentNonce = uint256(ModuleStorage.readBytes32Map(NonceKey.NONCE_KEY, bytes32(uint256(0))));
    if (currentNonce == 1 && state.immutableSignerContractFound) {
      return (true, true, state.imageHash);
    }

    (bool verified, bool needsUpdate) = _isValidImage(state.imageHash);
    return ((state.totalWeight >= threshold && verified), needsUpdate, state.imageHash);
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



