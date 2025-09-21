import { HardhatUserConfig } from 'hardhat/config';
import { networkConfig } from './utils/config-loader';
import * as dotenv from 'dotenv';

import '@nomiclabs/hardhat-truffle5';
import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-etherscan';
import '@nomicfoundation/hardhat-chai-matchers';
import "@nomicfoundation/hardhat-foundry";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

import 'hardhat-gas-reporter';
import 'solidity-coverage';

dotenv.config();
// Skip environment validation for local development
if (process.env.NODE_ENV !== 'development') {
  loadAndValidateEnvironment();
}

const config: HardhatUserConfig = {
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  solidity: {
    compilers: [{
      version: '0.8.27',
      settings: {
        evmVersion: 'cancun',
        optimizer: {
          enabled: true,
          runs: 999999,
          details: {
            yul: true,
            yulDetails: {
              stackAllocation: true,
              optimizerSteps: "dhfoDgvulfnTUtnIf xa dr cs gr"
            }
          }
        }
      }
    }],
  },
  paths: {
    sources: 'src/contracts',
    tests: 'tests'
  },
  // Adiciona os remappings do Foundry para o Hardhat
  external: {
    contracts: [
      {
        artifacts: "artifacts",
        deploy: "deploy"
      }
    ],
    deployments: {
      hardhat: ["deployments/hardhat"],
      localhost: ["deployments/hardhat"]
    }
  },
  networks: {
    // Define here to easily specify private keys
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts: [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // Primeira conta do Hardhat
      ],
      allowUnlimitedContractSize: true,
      allowBlocksWithSameTimestamp: true,
      gas: 30000000,
      blockGasLimit: 30000000
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
    },
    base_sepolia: {
      url: process.env.BASE_SEPOLIA_ENDPOINT,
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
