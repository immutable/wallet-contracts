pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;
// installed under @sequence/wallet-contracts alias instead of @0xsequence/wallet-contracts as the '0x' has problems with typechain
import "@sequence/wallet-contracts/contracts/modules/MainModule.sol";

contract MainModuleMock is MainModule {
    constructor(address _factory) MainModule(_factory) {}
}
