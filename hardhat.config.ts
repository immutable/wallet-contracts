import { HardhatUserConfig } from 'hardhat/config';
import { networkConfig } from './utils/config-loader';
import * as dotenv from 'dotenv';

import '@nomiclabs/hardhat-truffle5';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-etherscan';
import '@nomicfoundation/hardhat-chai-matchers';
import "@nomicfoundation/hardhat-foundry";

import 'hardhat-gas-reporter';
import 'solidity-coverage';
import "hardhat-contract-sizer";

dotenv.config();
loadAndValidateEnvironment();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ 
      version: '0.8.27',
      settings: {
        evmVersion: 'cancun',
        optimizer: {
          enabled: true,
          runs: 20,
          details: {
            yul: true
          }
        }
      }
    }],
  },
  paths: {
    sources: 'src/contracts',
    tests: 'tests'
  },
  networks: {
    // Define here to easily specify private keys
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts: []
    },
    devnet: {
      url: 'https://rpc.dev.immutable.com',
      accounts: []
    },
    testnet: {
      url: 'https://rpc.testnet.immutable.com',
      accounts: []
    },
    mainnet: {
      url: 'https://rpc.immutable.com',
      accounts: []
    },
    base: {
      url: process.env.BASE_MAINNET_ENDPOINT,
      accounts: []
    },
    arbitrum: {
      url: process.env.ARBITRUM_MAINNET_ENDPOINT,
      accounts: []
    }
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
