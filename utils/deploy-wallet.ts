import { network, run } from 'hardhat'
import * as _ from 'lodash'
import ora from 'ora'

import { Factory__factory } from '../src/gen/typechain'
import { encodeImageHash } from '../tests/utils/helpers'

import { ContractFactory, BigNumber, providers, Wallet } from 'ethers'

const prompt = ora()

/**
 * @notice Deploy a test user wallet
 */

const provider = new providers.Web3Provider(network.provider.send)

const deployerSigner = new Wallet('4c13dd22316be83887eec00ab8fbf913d812a713a10a2fc4212d96cbb5c0c4aa').connect(provider)
const userSigner = new Wallet('de380aa2999ac73079de7be1a10c2c7dd84eef06d51bfd9d538d29ce72bc70a9').connect(provider)

const txParams = {
  gasLimit: 6000000,
  gasPrice: BigNumber.from(10).pow(9).mul(2)
}

const main = async () => {
  prompt.info(`Network Name:           ${network.name}`)
  prompt.info(`Local Deployer Address: ${await deployerSigner.getAddress()}`)
  prompt.info(`Local Deployer Balance: ${await deployerSigner.getBalance()}`)
  prompt.info(`Local User Address: ${await userSigner.getAddress()}`)
  prompt.info(`Local User Balance: ${await userSigner.getBalance()}`)

  // Connect to the wallet factory addr
  const walletFactory = Factory__factory.connect('0x7ef00Fce0583D17946e34757844b8270a8Aa5DD1', deployerSigner)
  const walletDeployTx = await walletFactory.deploy(
    // Main Module
    '0xeaD61DA56691E5c377e5188fe49032fe8C5Ec253',
    // User EOA
    encodeImageHash(1, [{ weight: 1, address: '0xEE7Ae158b79Fb581055E7d6313A4a5c4bFC7D1b0' }]),
    txParams
  )

  prompt.info(`User SCW Address: ${walletDeployTx.hash}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
