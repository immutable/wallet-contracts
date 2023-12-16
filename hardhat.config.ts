import { HardhatUserConfig } from 'hardhat/config';
import { networkConfig } from './utils/config-loader';
import * as dotenv from 'dotenv';

import '@nomiclabs/hardhat-truffle5';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-etherscan';
import '@nomicfoundation/hardhat-chai-matchers';

import 'hardhat-gas-reporter';
import 'solidity-coverage';

dotenv.config();
loadAndValidateEnvironment();

const config: HardhatUserConfig = {
  defaultNetwork: "localhost",
  solidity: {
    compilers: [{ version: '0.8.17' }],
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
        details: {
          yul: true
        }
      }
    }
  },
  paths: {
    root: 'src',
    tests: 'tests'
  },
  networks: {
    // Define here to easily specify private keys
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts: [process.env.DEPLOYER_PRIV_KEY!, process.env.WALLET_IMPL_CHANGER_PRIV_KEY!]
    },
    devnet: {
      url: 'https://rpc.dev.immutable.com',
      accounts: [process.env.DEPLOYER_PRIV_KEY!, process.env.WALLET_IMPL_CHANGER_PRIV_KEY!]
    },
    testnet: {
      url: 'https://rpc.testnet.immutable.com',
      accounts: [process.env.DEPLOYER_PRIV_KEY!, process.env.WALLET_IMPL_CHANGER_PRIV_KEY!]
    },
    mainnet: {
      url: 'https://rpc.immutable.com',
      accounts: [process.env.DEPLOYER_PRIV_KEY!, process.env.WALLET_IMPL_CHANGER_PRIV_KEY!]
    },
  },
  mocha: {
    timeout: process.env.COVERAGE ? 15 * 60 * 1000 : 30 * 1000
  },
};

export default config;

function loadAndValidateEnvironment(): boolean {
  return !!process.env.DEPLOYER_PRIV_KEY &&
    !!process.env.WALLET_IMPL_CHANGER_PRIV_KEY &&
    !!process.env.DEPLOYER_CONTRACT_ADDRESS;
}
