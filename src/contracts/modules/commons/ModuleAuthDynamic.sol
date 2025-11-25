// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./ModuleAuthUpgradable.sol";
import "./ImageHashKey.sol";
import "../../Wallet.sol";


abstract contract ModuleAuthDynamic is ModuleAuthUpgradable {
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

  /// @notice Calculate imageHash for Immutable-only signer
  /// @dev Uses the iterative hash format matching ModuleAuth._signatureValidationWithUpdateCheck
  ///      For a single signer with threshold=1 and weight=1:
  ///      imageHash = keccak256(abi.encode(bytes32(threshold), weight, signerAddress))
  ///      Uses the IMMUTABLE_SIGNER_CONTRACT address directly as the signer
  function imageHashOfImmutableSigner() internal view returns (bytes32) {
    // Use the signer contract address directly (threshold=1, weight=1)
    bytes32 imageHash = bytes32(uint256(1));  // Start with threshold
    imageHash = keccak256(abi.encode(imageHash, uint256(1), IMMUTABLE_SIGNER_CONTRACT));  // Apply weight=1, contract address
    return imageHash;
  }

  /**
   * @notice Validates the given signature image hash against the known valid patterns,
   *         supporting both normal and bootstrap/upgrade paths:
   *         - If there is no stored image hash (first transaction after deployment),
   *           allows authentication in two ways:
   *             1. If the image hash was used as the salt for counterfactual wallet deployment,
   *                the image is valid and should now be stored.
   *             2. Alternatively, if the image hash matches the hash derived from the
   *                Immutable Signer contract, the image is also valid and should be stored.
   *         - In all these initial cases, the return value requests that the image hash
   *           is recorded for future use (second return value is true).
   *         - If a stored image hash exists, only that exact image hash is considered valid.
   *           In this case, there is no need to update the stored image hash
   *           (second return value is false).
   * @param _imageHash Hash image of the signature
   * @return (bool, bool) First value true if the image hash is valid,
   *                     second value true if the image hash needs to be stored/updated.
   */
  function _isValidImage(bytes32 _imageHash) internal view override returns (bool, bool) {
    // Standard validation: Check if CFA matches (for normal deployment)
    bytes32 storedImageHash = ModuleStorage.readBytes32(ImageHashKey.IMAGE_HASH_KEY);
    
    if (storedImageHash == 0) {
      // No image hash stored. Check that the image hash was used as the salt when 
      // deploying the wallet proxy contract.
      address computedAddress = address(
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
      );
      
      bool authenticated = computedAddress == address(this);
      
      // Indicate need to update = true. This will trigger a call to store the image hash
      if (authenticated) {
        return (true, true);
      } else {
        // BOOTSTRAP MODE: Check if signed by Immutable signer only
        // This allows deploying a wallet with a different salt (from another chain)
        // and using Immutable-only signature to authorize the first transaction
        bytes32 immutableImageHash = imageHashOfImmutableSigner();
        
        if (_imageHash == immutableImageHash) {
          return (true, true);  // Bootstrap with immutable signer
        }
      }

      return (false, false);  // Invalid signature
    }
    
    // Image hash has been stored. Compare it with the provided image hash
    bool isValid = _imageHash != bytes32(0) && _imageHash == storedImageHash;
    
    // Return the result of the comparison. No need to update the image hash.
    return (isValid, false);
  }
}