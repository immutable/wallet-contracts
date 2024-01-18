pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
contract ERC20Mock is ERC20 {
    uint i;
    constructor()ERC20("Mock", "M"){
        new ERC20("Mock", "M");
        new ERC20("Mock", "M");
        new ERC20("Mock", "M");
        new ERC20("Mock", "M");
        new ERC20("Mock", "M");
        new ERC20("Mock", "M");
        new ERC20("Mock", "M");
        new ERC20("Mock", "M");
        new ERC721("Mock", "M");
        new ERC721("Mock", "M");
        new ERC721("Mock", "M");
        new ERC721("Mock", "M");
        new ERC721("Mock", "M");
        new ERC721("Mock", "M");   
        new ERC1155(""); 
        new ERC1155("");
        new ERC1155("");
        new ERC1155("");
        new ERC1155("");
    }
}