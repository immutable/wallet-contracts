// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./ModuleAuthUpgradable.sol";
import "./ImageHashKey.sol";
import "../../Wallet.sol";

interface IImmutableSigner {
  struct ExpirableSigner {
    address signer;
    uint256 validUntil;
  }
  
  function primarySigner() external view returns (address);
  function rolloverSigner() external view returns (ExpirableSigner memory);
}

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
      // BOOTSTRAP MODE: Check if signed by Immutable signer only (for cross-chain deployment)
      // This allows deploying a wallet on a new chain with the same address but different signers
      // by temporarily accepting Immutable-only signature, then updating to the new signer set
      
      // Check PRIMARY signer
      address primarySignerEOA = IImmutableSigner(IMMUTABLE_SIGNER_CONTRACT).primarySigner();
      bytes32 primaryImageHash = keccak256(
        abi.encode(
          bytes32(uint256(1)),
          uint8(1),
          primarySignerEOA
        )
      );
      
      if (_imageHash == primaryImageHash) {
        // Valid bootstrap signature with primary signer - accept and store
        return (true, true);
      }
      
      // Check ROLLOVER signer (if still valid)
      IImmutableSigner.ExpirableSigner memory rollover = IImmutableSigner(IMMUTABLE_SIGNER_CONTRACT).rolloverSigner();
      if (block.timestamp <= rollover.validUntil && rollover.signer != address(0)) {
        bytes32 rolloverImageHash = keccak256(
          abi.encode(
            bytes32(uint256(1)),
            uint8(1),
            rollover.signer
          )
        );
        
        if (_imageHash == rolloverImageHash) {
          // Valid bootstrap signature with rollover signer - accept and store
          return (true, true);
        }
      }
      
      // NORMAL MODE: Check that the image hash was used as the salt when 
      // deploying the wallet proxy contract (for first deployment on original chain)
      // Backwards compatibility with previous deployment logic.
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



