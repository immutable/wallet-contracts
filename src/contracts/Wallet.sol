// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;

/**
 *  Minimal upgradeable proxy implementation that includes a function PROXY_getImplementation()
 *  function. The implementation contract is responsible for upgrade.
 *
 *   Source code is in WalletProxy.yul. To build run the script ./compileWalletProxyYul.sh
 */
library Wallet {
  bytes internal constant creationCode = hex"6054600f3d396034805130553df3fe63906111273d3560e01c14602b57363d3d373d3d3d3d369030545af43d82803e156027573d90f35b3d90fd5b30543d5260203df3";
}
