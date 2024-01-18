pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
contract ERC721Mock is ERC721 {
    uint256 private _tokenIdTracker;

    constructor()ERC721("Mock", "M"){
    }

    function mint(address to, uint256 amount) public {
        for(uint256 i = 0; i < amount; i++){
            _mint(to, _tokenIdTracker);
            _tokenIdTracker++;
        }
    }
}