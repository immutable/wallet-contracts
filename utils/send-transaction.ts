import { network, run, ethers } from 'hardhat'
import * as _ from 'lodash'
import ora from 'ora'

import { MainModule__factory } from '../src/gen/typechain'
import {
  encodeMessageData,
  encodeImageHash,
  encodeMetaTransactionsData,
  encodeMessageSubDigest,
  signAndExecuteMetaTx,
  walletMultiSign
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
  // type: 0,
  // gasLimit: 60000000,
  // gasPrice: BigNumber.from(10).pow(9).mul(12),
  maxPriorityFeePerGas: BigNumber.from(10).pow(9).mul(16),
  nonce: 8
}

const main = async () => {
  prompt.info(`Network Name:           ${network.name}`)
  prompt.info(`Local Deployer Address: ${await deployerSigner.getAddress()}`)
  prompt.info(`Local Deployer Balance: ${await deployerSigner.getBalance()}`)
  prompt.info(`Local User Address: ${await userSigner.getAddress()}`)
  prompt.info(`Local User Balance: ${await userSigner.getBalance()}`)

  const walletAddress = '0x22941a15e54257fAb6201c58683216cb16BD6677'
  const immutableSignerAddress = '0x2CFA8f64e1B49A2DF28532D1D30Cda45117cF778'
  const networkId = 5
  const nonce = 0

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

  const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

  const signature = await walletMultiSign(
    [
      { weight: 1, owner: userSigner },
      { weight: 1, owner: immutableSignerAddress, signature: '0x0003' }
    ],
    2,
    data,
    false
  )

  console.log(signature)

  const executionTx = await wallet.execute([transaction], nonce, signature, txParams)

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
