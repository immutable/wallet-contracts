// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../commons/interfaces/IModuleCalls.sol";
import "../commons/interfaces/IModuleAuthUpgradable.sol";
import "../../interfaces/IERC1271Wallet.sol";
import "../../utils/SignatureValidator.sol";
import "../../utils/LibBytes.sol";

contract RequireUtils is SignatureValidator {
  using LibBytes for bytes;

  uint256 private constant NONCE_BITS = 96;
  bytes32 private constant NONCE_MASK = bytes32((1 << NONCE_BITS) - 1);

  uint256 private constant FLAG_SIGNATURE = 0;
  uint256 private constant FLAG_ADDRESS = 1;
  uint256 private constant FLAG_DYNAMIC_SIGNATURE = 2;

  bytes32 private immutable INIT_CODE_HASH;
  address private immutable FACTORY;

  // Creation code of Proxy.sol. Set as state variable here to avoid compiler conflicts with library
  bytes private constant walletCreationCode =
  hex'608060405234801561001057600080fd5b5060405161029f38038061029f8339818101604052810190610032919061009e565b803055506100cb565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061006b82610040565b9050919050565b61007b81610060565b811461008657600080fd5b50565b60008151905061009881610072565b92915050565b6000602082840312156100b4576100b361003b565b5b60006100c284828501610089565b91505092915050565b6101c5806100da6000396000f3fe6080604052600436106100225760003560e01c806390611127146100a857610076565b36610076573373ffffffffffffffffffffffffffffffffffffffff16347f606834f57405380c4fb88d1f4850326ad3885f014bab3b568dfbf7a041eef73860405161006c90610113565b60405180910390a3005b60006100806100d3565b90503660008037600080366000845af43d6000803e80600081146100a3573d6000f35b3d6000fd5b3480156100b457600080fd5b506100bd6100d3565b6040516100ca9190610174565b60405180910390f35b60003054905090565b600082825260208201905092915050565b50565b60006100fd6000836100dc565b9150610108826100ed565b600082019050919050565b6000602082019050818103600083015261012c816100f0565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061015e82610133565b9050919050565b61016e81610153565b82525050565b60006020820190506101896000830184610165565b9291505056fea2646970667358221220d43fa02972046db2bc81804ebf600d5b46b97e55c738ea899a28224e111b588564736f6c63430008110033';

  struct Member {
    uint256 weight;
    address signer;
  }

  event RequiredConfig(
    address indexed _wallet,
    bytes32 indexed _imageHash,
    uint256 _threshold,
    bytes _signers
  );

  event RequiredSigner(
    address indexed _wallet,
    address indexed _signer
  );

  mapping(address => uint256) public lastSignerUpdate;
  mapping(address => uint256) public lastWalletUpdate;
  mapping(address => bytes32) public knownImageHashes;
  mapping(bytes32 => uint256) public lastImageHashUpdate;

  constructor(address _factory, address _mainModule) public {
    FACTORY = _factory;
    INIT_CODE_HASH = keccak256(abi.encodePacked(walletCreationCode, uint256(_mainModule)));
  }

  /**
   * @notice Publishes the current configuration of a Sequence wallets using logs
   * @dev Used for fast lookup of a wallet configuration based on its image-hash, compatible with updated and counter-factual wallets.
   *
   * @param _wallet      Sequence wallet
   * @param _threshold   Thershold of the current configuration
   * @param _members     Members of the current configuration
   * @param _index       True if an index in contract-storage is desired 
   */
  function publishConfig(
    address _wallet,
    uint256 _threshold,
    Member[] calldata _members,
    bool _index
  ) external {
    // Compute expected imageHash
    bytes32 imageHash = bytes32(uint256(_threshold));
    for (uint256 i = 0; i < _members.length; i++) {
      imageHash = keccak256(abi.encode(imageHash, _members[i].weight, _members[i].signer));
    }

    // Check against wallet imageHash
    (bool succeed, bytes memory data) = _wallet.call(abi.encodePacked(IModuleAuthUpgradable(_wallet).imageHash.selector));
    if (succeed && data.length == 32) {
      // Check contract defined
      bytes32 currentImageHash = abi.decode(data, (bytes32));
      require(currentImageHash == imageHash, "RequireUtils#publishConfig: UNEXPECTED_IMAGE_HASH");
    } else {
      // Check counter-factual
      require(address(
        uint256(
          keccak256(
            abi.encodePacked(
              byte(0xff),
              FACTORY,
              imageHash,
              INIT_CODE_HASH
            )
          )
        )
      ) == _wallet, "RequireUtils#publishConfig: UNEXPECTED_COUNTERFACTUAL_IMAGE_HASH");

      // Register known image-hash for counter-factual wallet
      if (_index) knownImageHashes[_wallet] = imageHash;
    }

    // Emit event for easy config retrieval
    emit RequiredConfig(_wallet, imageHash, _threshold, abi.encode(_members));

    if (_index) {
      // Register last event for given wallet
      lastWalletUpdate[_wallet] = block.number;

      // Register last event for image-hash
      lastImageHashUpdate[imageHash] = block.number;
    }
  }

  /**
   * @notice Publishes the configuration and set of signers for a counter-factual Sequence wallets using logs
   * @dev Used for fast lookup of a wallet based on its signer members, only signing members are included in the logs
   *   as a mechanism to avoid poisoning of the directory of wallets.
   *
   *   Only the initial counter-factual configuration can be published, to publish updated configurations see `publishConfig`.
   *
   * @param _wallet      Sequence wallet
   * @param _hash        Any hash signed by the wallet
   * @param _sizeMembers Number of members on the counter-factual configuration
   * @param _signature   Signature for the given hash
   * @param _index       True if an index in contract-storage is desired 
   */
  function publishInitialSigners(
    address _wallet,
    bytes32 _hash,
    uint256 _sizeMembers,
    bytes memory _signature,
    bool _index
  ) external {
    // Decode and index signature
    (
      uint16 threshold,  // required threshold signature
      uint256 rindex     // read index
    ) = _signature.readFirstUint16();

    // Generate sub-digest
    bytes32 subDigest; {
      uint256 chainId; assembly { chainId := chainid() }
      subDigest = keccak256(
        abi.encodePacked(
          "\x19\x01",
          chainId,
          _wallet,
          _hash
        )
      );
    }

    // Recover signature
    bytes32 imageHash = bytes32(uint256(threshold));

    Member[] memory members = new Member[](_sizeMembers);
    uint256 membersIndex = 0;

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
        addr = recoverSigner(subDigest, signature);

        // Publish signer
        _publishSigner(_wallet, addr, _index);
      } else if (flag == FLAG_DYNAMIC_SIGNATURE) {
        // Read signer
        (addr, rindex) = _signature.readAddress(rindex);

        {
          // Read signature size
          uint256 size;
          (size, rindex) = _signature.readUint16(rindex);

          // Read dynamic size signature
          bytes memory signature;
          (signature, rindex) = _signature.readBytes(rindex, size);
          require(isValidSignature(subDigest, addr, signature), "ModuleAuth#_signatureValidation: INVALID_SIGNATURE");
        }

        // Publish signer
        _publishSigner(_wallet, addr, _index);
      } else {
        revert("RequireUtils#publishInitialSigners: INVALID_SIGNATURE_FLAG");
      }

      // Store member on array
      members[membersIndex] = Member(addrWeight, addr);
      membersIndex++;

      // Write weight and address to image
      imageHash = keccak256(abi.encode(imageHash, addrWeight, addr));
    }

    require(membersIndex == _sizeMembers, "RequireUtils#publishInitialSigners: INVALID_MEMBERS_COUNT");

    // Check against counter-factual imageHash
    require(address(
      uint256(
        keccak256(
          abi.encodePacked(
            byte(0xff),
            FACTORY,
            imageHash,
            INIT_CODE_HASH
          )
        )
      )
    ) == _wallet, "RequireUtils#publishInitialSigners: UNEXPECTED_COUNTERFACTUAL_IMAGE_HASH");

    // Emit event for easy config retrieval
    emit RequiredConfig(_wallet, imageHash, threshold, abi.encode(members));

    if (_index) {
      // Register last event for given wallet
      lastWalletUpdate[_wallet] = block.number;

      // Register last event for image-hash
      lastImageHashUpdate[imageHash] = block.number;

      // Register known image-hash for counter-factual wallet
      knownImageHashes[_wallet] = imageHash;
    }
  }

  /**
   * @notice Validates that a given expiration hasn't expired
   * @dev Used as an optional transaction on a Sequence batch, to create expirable transactions.
   *
   * @param _expiration  Expiration to check
   */
  function requireNonExpired(uint256 _expiration) external view {
    require(block.timestamp < _expiration, "RequireUtils#requireNonExpired: EXPIRED");
  }

  /**
   * @notice Validates that a given wallet has reached a given nonce
   * @dev Used as an optional transaction on a Sequence batch, to define transaction execution order
   *
   * @param _wallet Sequence wallet
   * @param _nonce  Required nonce
   */
  function requireMinNonce(address _wallet, uint256 _nonce) external view {
    (uint256 space, uint256 nonce) = _decodeNonce(_nonce);
    uint256 currentNonce = IModuleCalls(_wallet).readNonce(space);
    require(currentNonce >= nonce, "RequireUtils#requireMinNonce: NONCE_BELOW_REQUIRED");
  }

  /**
   * @notice Decodes a raw nonce
   * @dev A raw nonce is encoded using the first 160 bits for the space
   *  and the last 96 bits for the nonce
   * @param _rawNonce Nonce to be decoded
   * @return _space The nonce space of the raw nonce
   * @return _nonce The nonce of the raw nonce
   */
  function _decodeNonce(uint256 _rawNonce) private pure returns (uint256 _space, uint256 _nonce) {
    _nonce = uint256(bytes32(_rawNonce) & NONCE_MASK);
    _space = _rawNonce >> NONCE_BITS;
  }

  /**
   * @notice Publishes a signer that was validated to sign for a particular wallet
   * @param _wallet Address of the wallet
   * @param _signer Address of the signer
   * @param _index True if an index on contract storage is desired
   */
  function _publishSigner(address _wallet, address _signer, bool _index) private {
    // Required signer event
    emit RequiredSigner(_wallet, _signer);

    if (_index) {
      // Register last event for given signer
      lastSignerUpdate[_signer] = block.number;
    }
  }
}
