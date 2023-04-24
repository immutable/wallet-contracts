import { network, run, tenderly, ethers } from 'hardhat'
import * as _ from 'lodash'
import ora from 'ora'

import {
  Factory__factory,
  MainModule__factory,
  // MainModuleUpgradable__factory,
  ImmutableSigner__factory
} from '../src/gen/typechain'

import { LedgerSigner } from '@ethersproject/hardware-wallets'
import { ContractFactory, BigNumber, providers, Wallet } from 'ethers'
import fs from 'fs'

const prompt = ora()

/**
 * @notice Deploy core wallet contracts via hardware wallet on reserved nonces
 *
 *   1. Deploy Wallet Factory
 *   2. Deploy Main Module
 *   3. Deploy Immutable Signer
 */

const provider = new providers.JsonRpcProvider('https://eth-goerli.g.alchemy.com/v2/SbVLuhFIDqX1e7AvsGoEdZBQWvSHdCBF')

const signer = new LedgerSigner(provider)
// const signer = new Wallet('46143d571a8ba0e97e2d9322502b5eaf686b58f26d62967a123d5825ae68a7b7').connect(provider)

const txParams = {
  gasLimit: 6000000,
  gasPrice: BigNumber.from(10).pow(9).mul(2)
}

const attempVerify = async <T extends ContractFactory>(
  name: string,
  _: new () => T,
  address: string,
  ...args: Parameters<T['deploy']>
) => {
  try {
    await run('verify:verify', {
      address: address,
      constructorArguments: args
    })
  } catch {}

  // try {
  //   await tenderly.verify({
  //     name: name,
  //     address: address
  //   })
  // } catch {}
}

const buildNetworkJson = (...contracts: { name: string; address: string }[]) => {
  return contracts.map(c => ({
    contractName: c.name,
    address: c.address
  }))
}

const main = async () => {
  prompt.info(`Network Name:           ${network.name}`)
  prompt.info(`Local Deployer Address: ${await signer.getAddress()}`)
  prompt.info(`Local Deployer Balance: ${await signer.getBalance()}`)

  // FIXME: allow better configuration when passing those in?
  const adminAddress = '0x0ace09c142815E0a721CE5fe10399451DeaEd2b8'
  const deployerAddress = '0x95fbeB1f846B435c04F9E47793E74cE1a3488325'

  // Wallet Factory
  // TODO: keep track/naming?
  // TODO: check nonces?
  // FIXME: try/catch deployment errors?
  // FIXME: check expected addresses to verify if the contracts are already deployed?
  const Factory = await ethers.getContractFactory('Factory')
  const walletFactory = await Factory.connect(signer).deploy(adminAddress, deployerAddress, txParams)
  prompt.info(`Wallet Factory: ${walletFactory.address}`)

  // const mainModule = await new MainModule__factory().connect(signer).deploy(walletFactory.address, txParams)
  // prompt.info(`Main Module: ${mainModule.address}`)

  // const immutableSigner = await new ImmutableSigner__factory().connect(signer).deploy(adminAddress, txParams)
  // prompt.info(`Immutable Signer: ${immutableSigner.address}`)

  // prompt.start(`writing deployment information to ${network.name}.json`)
  // fs.writeFileSync(
  //   `./src/networks/${network.name}.json`,
  //   JSON.stringify(
  //     buildNetworkJson(
  //       { name: 'WalletFactory', address: walletFactory.address },
  //       { name: 'MainModule', address: mainModule.address },
  //       { name: 'MainModuleUpgradable', address: mainModuleUpgradeable.address },
  //       { name: 'GuestModule', address: guestModule.address },
  //       { name: 'SequenceUtils', address: sequenceUtils.address },
  //       { name: 'RequireFreshSignerLib', address: requireFreshSignerLib.address }
  //     ),
  //     null,
  //     2
  //   )
  // )
  // prompt.succeed()

  prompt.start(`verifying contracts`)

  await attempVerify('Factory', Factory__factory, walletFactory.address)
  await attempVerify('MainModule', MainModule__factory, mainModule.address, walletFactory.address)
  await attempVerify('ImmutableSigner', ImmutableSigner__factory, immutableSigner.address, adminAddress)

  prompt.succeed()
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
