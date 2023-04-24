import { network, run } from 'hardhat'
import * as _ from 'lodash'
import ora from 'ora'

import { MainModule__factory } from '../src/gen/typechain'
import {
  encodeImageHash,
  encodeMetaTransactionsData,
  encodeMessageSubDigest,
  walletMultiSign,
  signAndExecuteMetaTx
} from '../tests/utils/helpers'

import { ContractFactory, BigNumber, providers, Wallet, utils } from 'ethers'

const prompt = ora()

/**
 * @notice Send a transaction to a test user wallet
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

  const walletAddress = '0x10672b50F596b1A995a97BAB087227E4A74dd63D'
  const networkId = 5

  // Connect to the generated user address
  const wallet = MainModule__factory.connect(walletAddress, deployerSigner)

  // Return some funds to the funds account
  const transaction = {
    delegateCall: false,
    revertOnError: true,
    gasLimit: 1000000,
    target: '0x10EFC120F60E2fdF3402f5bC5c4851844e9BE98d',
    value: 1,
    data: []
  }

  const executionTx = await signAndExecuteMetaTx(wallet, userSigner, [transaction], networkId)

  prompt.info(`Execution transaction hash: ${executionTx.hash}`)
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
