// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title TestNFT
 * @notice Simple ERC721 NFT for testing Seaport purchases
 * @dev Used in sample-app Script 03 to demonstrate NFT purchase flow
 */
contract TestNFT is ERC721, Ownable {
  uint256 private _tokenIdCounter;
  string private _baseTokenURI;

  constructor(string memory name, string memory symbol, string memory baseURI) ERC721(name, symbol) {
    _baseTokenURI = baseURI;
  }

  /**
   * @notice Mint a new NFT to the specified address
   * @param to Address to mint the NFT to
   * @return tokenId The ID of the newly minted token
   */
  function mint(address to) external onlyOwner returns (uint256) {
    uint256 tokenId = _tokenIdCounter;
    _tokenIdCounter++;
    _safeMint(to, tokenId);
    return tokenId;
  }

  /**
   * @notice Mint multiple NFTs to the specified address
   * @param to Address to mint the NFTs to
   * @param count Number of NFTs to mint
   */
  function mintBatch(address to, uint256 count) external onlyOwner {
    for (uint256 i = 0; i < count; i++) {
      uint256 tokenId = _tokenIdCounter;
      _tokenIdCounter++;
      _safeMint(to, tokenId);
    }
  }

  /**
   * @notice Get the base URI for token metadata
   */
  function _baseURI() internal view override returns (string memory) {
    return _baseTokenURI;
  }

  /**
   * @notice Update the base URI (only owner)
   */
  function setBaseURI(string memory baseURI) external onlyOwner {
    _baseTokenURI = baseURI;
  }

  /**
   * @notice Get the current token counter
   */
  function totalSupply() external view returns (uint256) {
    return _tokenIdCounter;
  }
}
