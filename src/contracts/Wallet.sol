// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.3;

// Holds the creation code of the Proxy.sol used by smart contract wallet instances
library Wallet {
  bytes internal constant creationCode =
    hex'608060405234801561001057600080fd5b506040516101e03803806101e08339818101604052810190610032919061009e565b803055506100cb565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061006b82610040565b9050919050565b61007b81610060565b811461008657600080fd5b50565b60008151905061009881610072565b92915050565b6000602082840312156100b4576100b361003b565b5b60006100c284828501610089565b91505092915050565b610106806100da6000396000f3fe608060405260043610601f5760003560e01c80639061112714604b576025565b36602557005b366000803760008036600030545af43d6000803e80600081146046573d6000f35b3d6000fd5b348015605657600080fd5b50605d6071565b6040516068919060b7565b60405180910390f35b60003054905090565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600060a382607a565b9050919050565b60b181609a565b82525050565b600060208201905060ca600083018460aa565b9291505056fea264697066735822122074fe0440d390429dff5a892d64613758f7c145bfd7856e0ab26b6c7d42efe80764736f6c63430008110033';
}
