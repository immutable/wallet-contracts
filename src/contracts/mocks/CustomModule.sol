pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

contract CustomModule {
    string public str;

    function getStr() public view returns (string memory) {
        return str;
    }

    function setStr(string memory _str) public {
        str = _str;
    }
}