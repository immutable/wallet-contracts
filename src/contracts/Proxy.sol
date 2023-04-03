// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.3;

/*
  Proxy contract which is used as the proxy contract for smart contract wallet instances.
  Exposes a view function to retrieve the implementation address stored at the address storage location.
 */
contract Proxy {
    ///     =====   Events  =====

    /// @dev Event emitted when proxy receives native token value
    event Received(uint indexed value, address indexed sender, bytes data);

    ///     =====   Constructor  =====

    /// @dev Sets implementation contract on deployment
    constructor(address _implementation) {
        assembly {
            sstore(address(), _implementation)
        } 
    }

    /// @dev Retrieve current implementation contract used by proxy
    function PROXY_getImplementation() public view returns (address implementation) {
        assembly{
            implementation := sload(address())
        }
    }

    /// @dev Fallback function to forward calls to implementation contract
    fallback() external payable {
        address target = PROXY_getImplementation();
        // solhint-disable-next-line no-inline-assembly
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {revert(0, returndatasize())}
            default {return (0, returndatasize())}
        }
    }
    
    // Receive function so the proxy may receive the native token
    receive() external payable {
        emit Received(msg.value, msg.sender, "");
    }
}