import { HardhatUserConfig } from 'hardhat/config'
import { networkConfig } from './utils/config-loader'

import '@nomiclabs/hardhat-truffle5'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-web3'
import '@nomiclabs/hardhat-etherscan'
import '@nomicfoundation/hardhat-chai-matchers'

import 'hardhat-gas-reporter'
import 'solidity-coverage'

require('dotenv').config();

const ganacheNetwork = {
  url: 'http://127.0.0.1:8545',
  blockGasLimit: 6000000000
}

const config: HardhatUserConfig = {
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
    tests: '../tests'
  },
  networks: {
    // Define here to easily specify private keys
    zkevm: {
      url: "https://zkevm-rpc.sandbox.x.immutable.com",
      accounts: [process.env.DEPLOYER_PRIV_KEY!, process.env.WALLET_IMPL_CHANGER_PRIV_KEY!]
    },
    sepolia: networkConfig('sepolia'),
    mainnet: networkConfig('mainnet'),
    ropsten: networkConfig('ropsten'),
    rinkeby: networkConfig('rinkeby'),
    kovan: networkConfig('kovan'),
    goerli: networkConfig('goerli'),
    matic: networkConfig('matic'),
    mumbai: networkConfig('mumbai'),
    arbitrum: networkConfig('arbitrum'),
    arbitrumTestnet: networkConfig('arbitrum-testnet'),
    optimism: networkConfig('optimism'),
    metis: networkConfig('metis'),
    nova: networkConfig('nova'),
    avalanche: networkConfig('avalanche'),
    avalancheTestnet: networkConfig('avalanche-testnet'),
    ganache: ganacheNetwork,
    coverage: {
      url: 'http://localhost:8555'
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: networkConfig('mainnet').etherscan
  },
  mocha: {
    timeout: process.env.COVERAGE ? 15 * 60 * 1000 : 30 * 1000
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS === true,
    currency: 'USD',
    gasPrice: 21,
    showTimeSpent: true
  },
}

export default config
