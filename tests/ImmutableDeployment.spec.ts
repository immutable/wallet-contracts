import { ethers as hardhat } from 'hardhat'
import { ethers } from 'ethers'
import { getContractAddress } from '@ethersproject/address'
import { Factory, Factory__factory, MainModule, MainModule__factory, ImmutableSigner, ImmutableSigner__factory } from '../src'
import { encodeImageHash, expect, addressOf, encodeMetaTransactionsData, walletMultiSign, ethSign } from './utils'

describe('E2E Immutable Wallet Deployment', () => {
  let contractDeployerEOA: ethers.Signer
  let relayerEOA: ethers.Signer

  let userEOA: ethers.Signer
  let immutableEOA: ethers.Signer
  let randomEOA: ethers.Signer
  let adminEOA: ethers.Signer
  let walletDeployerEOA: ethers.Signer

  // All contracts involved in the wallet ecosystem
  let factory: Factory
  let mainModule: MainModule
  let immutableSigner: ImmutableSigner

  const WALLET_FACTORY_NONCE = 1
  const MAIN_MODULE_NONCE = 2
  const IMMUTABLE_SIGNER_NONCE = 3

  beforeEach(async () => {
    [contractDeployerEOA, userEOA, immutableEOA, randomEOA, adminEOA, walletDeployerEOA, relayerEOA] = await hardhat.getSigners()

    // Matches the production environment where the first transaction (nonce 0)
    // is used for testing.
    contractDeployerEOA.sendTransaction({ to: ethers.constants.AddressZero, value: 0 })

    factory = await new Factory__factory()
      .connect(contractDeployerEOA)
      .deploy(await adminEOA.getAddress(), await walletDeployerEOA.getAddress())

    mainModule = await new MainModule__factory()
      .connect(contractDeployerEOA)
      .deploy(factory.address)

    immutableSigner = await new ImmutableSigner__factory()
      .connect(contractDeployerEOA)
      .deploy(await adminEOA.getAddress(), await immutableEOA.getAddress())
  })

  it('Should create deterministic contract addresses', async () => {
    // Generate deployed contract addresses offchain from the deployer address
    // and fixed nonces.
    const factoryAddress = getContractAddress({
      from: await contractDeployerEOA.getAddress(),
      nonce: WALLET_FACTORY_NONCE
    })

    const mainModuleAddress = getContractAddress({
      from: await contractDeployerEOA.getAddress(),
      nonce: MAIN_MODULE_NONCE
    })

    const immutableSignerAddress = getContractAddress({
      from: await contractDeployerEOA.getAddress(),
      nonce: IMMUTABLE_SIGNER_NONCE
    })

    // Check they match against the actual deployed addresses
    expect(factory.address).to.equal(factoryAddress)
    expect(mainModule.address).to.equal(mainModuleAddress)
    expect(immutableSigner.address).to.equal(immutableSignerAddress)
  })

  it('Should execute a transaction signed by the ImmutableSigner', async () => {
    // Deploy wallet
    const walletSalt = encodeImageHash(2, [
      { weight: 1, address: await userEOA.getAddress() },
      { weight: 1, address: immutableSigner.address }
    ])
    const walletAddress = addressOf(factory.address, mainModule.address, walletSalt)
    const walletDeploymentTx = await factory.connect(walletDeployerEOA).deploy(mainModule.address, walletSalt)
    await walletDeploymentTx.wait()


    // Connect to the generated user address
    const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

    // Transfer funds to the SCW
    const transferTx = await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })
    await transferTx.wait()

    // Return funds
    const transaction = {
      delegateCall: false,
      revertOnError: true,
      gasLimit: 1000000,
      target: await relayerEOA.getAddress(),
      value: 1,
      data: []
    }

    // Build meta-transaction
    const networkId = (await hardhat.provider.getNetwork()).chainId
    const nonce = 0
    const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

    const signature = await walletMultiSign(
      [
        { weight: 1, owner: userEOA as ethers.Wallet },
        // 03 -> Call the address' isValidSignature()
        { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data)) + '03' }
      ],
      2,
      data,
      false
    )

    const executionTx = await wallet.execute([transaction], nonce, signature)
    await executionTx.wait()
  })

  it('Should not execute a transaction not signed by the ImmutableSigner', async () => {
    // Deploy wallet
    const walletSalt = encodeImageHash(2, [
      { weight: 1, address: await contractDeployerEOA.getAddress() },
      { weight: 1, address: immutableSigner.address }
    ])
    const walletAddress = addressOf(factory.address, mainModule.address, walletSalt)
    const walletDeploymentTx = await factory.connect(walletDeployerEOA).deploy(mainModule.address, walletSalt)
    await walletDeploymentTx.wait()


    // Connect to the generated user address
    const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

    // Transfer funds to the SCW
    const transferTx = await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })
    await transferTx.wait()

    // Return funds
    const transaction = {
      delegateCall: false,
      revertOnError: true,
      gasLimit: 1000000,
      target: await relayerEOA.getAddress(),
      value: 1,
      data: []
    }

    // Build meta-transaction
    const networkId = (await hardhat.provider.getNetwork()).chainId
    const nonce = 0
    const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

    const signature = await walletMultiSign(
      [
        { weight: 1, owner: contractDeployerEOA as ethers.Wallet },
        { weight: 1, owner: immutableSigner.address, signature: (await ethSign(randomEOA as ethers.Wallet, data)) + '03' }
      ],
      2,
      data,
      false
    )

    await expect(wallet.execute([transaction], nonce, signature)).to.be.revertedWith('ModuleAuth#_signatureValidation: INVALID_SIGNATURE')
  })

  it('Should not execute a transaction signed by the ImmutableSigner with the incorrect data', async () => {
    // Deploy wallet
    const walletSalt = encodeImageHash(2, [
      { weight: 1, address: await userEOA.getAddress() },
      { weight: 1, address: immutableSigner.address }
    ])
    const walletAddress = addressOf(factory.address, mainModule.address, walletSalt)
    const walletDeploymentTx = await factory.connect(walletDeployerEOA).deploy(mainModule.address, walletSalt)
    await walletDeploymentTx.wait()


    // Connect to the generated user address
    const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

    // Transfer funds to the SCW
    const transferTx = await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })
    await transferTx.wait()

    // Return funds
    const transaction = {
      delegateCall: false,
      revertOnError: true,
      gasLimit: 1000000,
      target: await relayerEOA.getAddress(),
      value: 1,
      data: []
    }

    // Build meta-transaction
    const networkId = (await hardhat.provider.getNetwork()).chainId
    const nonce = 0
    const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

    const meaninglessDataDisturbance = '05'
    const signature = await walletMultiSign(
      [
        { weight: 1, owner: userEOA as ethers.Wallet },
        // 03 -> Call the address' isValidSignature()
        {
          weight: 1,
          owner: immutableSigner.address,
          signature: (await ethSign(immutableEOA as ethers.Wallet, data + meaninglessDataDisturbance)) + '03'
        }
      ],
      2,
      data,
      false
    )

    await expect(wallet.execute([transaction], nonce, signature)).to.be.revertedWith('ModuleAuth#_signatureValidation: INVALID_SIGNATURE')
  })
})
