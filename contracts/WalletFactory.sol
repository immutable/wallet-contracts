// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
import "solmate/src/utils/CREATE3.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WalletFactory
 * @notice Factory contract to retrieve counterfactual wallet addresses and
 * deploy new Sequence wallet instances to those addresses
 */
contract WalletFactory is Ownable {
    // wallet creation code from @0xsequence/wallet-contracts/contracts/Wallet.sol
    bytes internal constant walletCreationCode =
        hex"603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3";

    event WalletDeployed(
        address indexed wallet,
        address indexed mainModule,
        bytes32 salt
    );

    /**
     * @notice Returns a deterministic contract address given a salt
     * @param _mainModule Address of the main module to be used by the wallet
     * @param _salt Salt used to generate the address
     * @return _address The deterministic address
     */
    function getAddress(address _mainModule, bytes32 _salt)
        public
        view
        returns (address _address)
    {
        bytes32 _hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                _salt,
                keccak256(
                    abi.encodePacked(
                        walletCreationCode,
                        uint256(uint160(_mainModule))
                    )
                )
            )
        );
        return address(uint160(uint256(_hash)));
    }

    /**
     * @notice Will deploy a new wallet instance using create2
     * @param _mainModule Address of the main module to be used by the wallet
     * @param _salt Salt used to generate the wallet, which is the imageHash
     *       of the wallet's configuration.
     * @dev It is recommended to not have more than 200 signers as opcode repricing
     *      could make transactions impossible to execute as all the signers must be
     *      passed for each transaction.
     */
    function deploy(address _mainModule, bytes32 _salt)
        public
        payable
        onlyOwner
        returns (address _contract)
    {
        bytes memory code = abi.encodePacked(
            walletCreationCode,
            uint256(uint160(_mainModule))
        );
        assembly {
            _contract := create2(callvalue(), add(code, 32), mload(code), _salt)
        }
        // check deployment success
        require(_contract != address(0), "WalletFactory: deployment failed");
        // emit event, increases gas cost by ~2k
        emit WalletDeployed(_contract, _mainModule, _salt);
    }
}
