pragma solidity 0.7.6;

import "./modules/commons/interfaces/IModuleCalls.sol";
pragma experimental ABIEncoderV2;

interface IFactory {
    function deploy(address _mainModule, bytes32 _salt) external payable returns (address);
}

contract MultiCallDeploy {
    function deployAndExecute(address cfa, address _mainModule, bytes32 _salt, address factory,  IModuleCalls.Transaction[] calldata _txs, uint256 _nonce, bytes calldata _signature) external {
        // Get code size at CFA
        uint32 size;
        assembly {
            size := extcodesize(cfa)
        }

        // If size is 0, deploy the proxy
        // Else, execute the users transaction
        if (size == 0) {
            address ret = IFactory(factory).deploy(_mainModule, _salt);
            require(cfa == ret, "deployment addr does not match CFA");
            IModuleCalls(ret).execute(_txs, _nonce, _signature);
        } else {
            IModuleCalls(cfa).execute(_txs, _nonce, _signature);
        }
    }
}