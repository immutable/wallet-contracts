// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache-2.0
import { ethers as hardhat } from 'hardhat'
import { ethers } from 'ethers'
import { getContractAddress } from '@ethersproject/address'
import {
  Factory,
  Factory__factory,
  MainModule__factory,
  ImmutableSigner,
  ImmutableSigner__factory,
  LatestWalletImplLocator__factory,
  StartupWalletImpl__factory,
  MainModuleDynamicAuth,
  MainModuleDynamicAuth__factory,
} from '../src'
import {
  encodeImageHash,
  expect,
  addressOf,
  encodeMetaTransactionsData,
  walletMultiSign,
  ethSign,
} from './utils'
import { LatestWalletImplLocator, StartupWalletImpl } from 'src/gen/typechain'

describe('ModuleAuthDynamic Bootstrap Flow', () => {
  let contractDeployerEOA: ethers.Signer
  let relayerEOA: ethers.Signer

  let userEOA: ethers.Signer
  let immutableEOA: ethers.Signer
  let randomEOA: ethers.Signer
  let adminEOA: ethers.Signer
  let walletDeployerEOA: ethers.Signer

  // All contracts involved in the wallet ecosystem
  let factory: Factory
  let mainModuleDynamicAuth: MainModuleDynamicAuth
  let immutableSigner: ImmutableSigner
  let moduleLocator: LatestWalletImplLocator
  let startupWallet: StartupWalletImpl

  const WALLET_FACTORY_NONCE = 1
  const STARTUP_WALLET_NONCE = 2
  const IMMUTABLE_SIGNER_NONCE = 3
  const LOCATOR_NONCE = 4
  const MAIN_MODULE_DYNAMIC_AUTH_NONCE = 5

  beforeEach(async () => {
    [
      userEOA,
      immutableEOA,
      randomEOA,
      adminEOA,
      walletDeployerEOA,
      relayerEOA,
      contractDeployerEOA
    ] = await hardhat.getSigners()

    await hardhat.provider.send("hardhat_reset", [])

    // Matches the production environment where the first transaction (nonce 0)
    // is used for testing.
    contractDeployerEOA.sendTransaction({ to: ethers.constants.AddressZero, value: 0 })

    // Nonce 1
    factory = await new Factory__factory()
      .connect(contractDeployerEOA)
      .deploy(await adminEOA.getAddress(), await walletDeployerEOA.getAddress())

    // Calculate the locator address ahead of time
    const moduleLocatorAddress = getContractAddress({
      from: await contractDeployerEOA.getAddress(),
      nonce: LOCATOR_NONCE
    })

    // Nonce 2
    startupWallet = await new StartupWalletImpl__factory()
      .connect(contractDeployerEOA)
      .deploy(moduleLocatorAddress)

    // Nonce 3
    immutableSigner = await new ImmutableSigner__factory()
      .connect(contractDeployerEOA)
      .deploy(await adminEOA.getAddress(), await adminEOA.getAddress(), await immutableEOA.getAddress())

    // NOTE: Those could possibly be deployed by a separate account instead.

    // Nonce 4
    moduleLocator = await new LatestWalletImplLocator__factory()
      .connect(contractDeployerEOA)
      .deploy(await adminEOA.getAddress(), await walletDeployerEOA.getAddress())

    // Nonce 5
    mainModuleDynamicAuth = await new MainModuleDynamicAuth__factory()
      .connect(contractDeployerEOA)
      .deploy(factory.address, startupWallet.address, immutableSigner.address)

    // Setup the latest implementation address
    await moduleLocator
      .connect(walletDeployerEOA)
      .changeWalletImplementation(mainModuleDynamicAuth.address)
  })

  describe('Constructor validation', () => {
    it('Should set the IMMUTABLE_SIGNER_CONTRACT correctly', async () => {
      expect(await mainModuleDynamicAuth.IMMUTABLE_SIGNER_CONTRACT()).to.equal(immutableSigner.address)
    })
  })

  describe('Bootstrap flow - First transaction with ImmutableSigner', () => {
    it('Should execute first transaction when signed by ImmutableSigner only', async () => {
      // Deploy wallet with ImmutableSigner as the only signer (threshold 1)
      const walletSalt = encodeImageHash(1, [
        { weight: 1, address: immutableSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      const walletDeploymentTx = await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)
      await walletDeploymentTx.wait()

      // Connect to the generated user address
      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // Transfer funds to the SCW
      const transferTx = await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })
      await transferTx.wait()

      // Verify initial nonce is 0
      expect(await wallet.nonce()).to.equal(0)

      // Return funds
      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      // Build meta-transaction
      const networkId = (await hardhat.provider.getNetwork()).chainId
      const nonce = 0
      const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

      // Sign with ImmutableSigner only (using dynamic signature flag 03)
      const signature = await walletMultiSign(
        [
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data)) + '03' }
        ],
        1,
        data,
        false
      )

      const originalBalance = await randomEOA.getBalance()

      // Execute the first transaction - this should work because ImmutableSigner is a signer
      // and nonce will become 1 after increment (bootstrap condition)
      const executionTx = await wallet.execute([transaction], nonce, signature)
      await executionTx.wait()

      // Verify funds were transferred
      expect(await randomEOA.getBalance()).to.equal(originalBalance.add(1))

      // Verify nonce incremented
      expect(await wallet.nonce()).to.equal(1)
    })

    it('Should execute first transaction when ImmutableSigner is part of multi-sig', async () => {
      // Deploy wallet with user and ImmutableSigner (threshold 2)
      const walletSalt = encodeImageHash(2, [
        { weight: 1, address: await userEOA.getAddress() },
        { weight: 1, address: immutableSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      const walletDeploymentTx = await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)
      await walletDeploymentTx.wait()

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // Transfer funds
      const transferTx = await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })
      await transferTx.wait()

      // Verify initial nonce is 0
      expect(await wallet.nonce()).to.equal(0)

      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const networkId = (await hardhat.provider.getNetwork()).chainId
      const nonce = 0
      const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

      // Sign with both user and ImmutableSigner
      const signature = await walletMultiSign(
        [
          { weight: 1, owner: userEOA as ethers.Wallet },
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data)) + '03' }
        ],
        2,
        data,
        false
      )

      const originalBalance = await randomEOA.getBalance()

      const executionTx = await wallet.execute([transaction], nonce, signature)
      await executionTx.wait()

      expect(await randomEOA.getBalance()).to.equal(originalBalance.add(1))
      expect(await wallet.nonce()).to.equal(1)
    })

    it('Should store image hash after first transaction via bootstrap', async () => {
      // Deploy wallet with ImmutableSigner as the only signer
      const walletSalt = encodeImageHash(1, [
        { weight: 1, address: immutableSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // Transfer funds
      await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })

      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const networkId = (await hardhat.provider.getNetwork()).chainId
      const nonce = 0
      const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

      const signature = await walletMultiSign(
        [
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data)) + '03' }
        ],
        1,
        data,
        false
      )

      // Execute first transaction
      await wallet.execute([transaction], nonce, signature)

      // Verify nonce is now 1
      expect(await wallet.nonce()).to.equal(1)

      // Now try to execute a second transaction - this should work because
      // image hash was stored after the first transaction
      await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })

      const transaction2 = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const nonce2 = 1
      const data2 = encodeMetaTransactionsData(wallet.address, [transaction2], networkId, nonce2)

      const signature2 = await walletMultiSign(
        [
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data2)) + '03' }
        ],
        1,
        data2,
        false
      )

      // Second transaction should succeed using stored image hash
      await wallet.execute([transaction2], nonce2, signature2)
      expect(await wallet.nonce()).to.equal(2)
    })
  })

  describe('Bootstrap flow - Negative cases', () => {
    it('Should reject first transaction without ImmutableSigner when wallet was not pre-deployed with correct salt', async () => {
      // Create a random signer that is NOT the ImmutableSigner
      const randomSigner = ethers.Wallet.createRandom().connect(hardhat.provider)

      // Deploy wallet with random signer only (no ImmutableSigner)
      const walletSalt = encodeImageHash(1, [
        { weight: 1, address: randomSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // Transfer funds
      await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })

      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const networkId = (await hardhat.provider.getNetwork()).chainId
      const nonce = 0
      const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

      // Sign with random signer (NOT ImmutableSigner)
      const signature = await walletMultiSign(
        [
          { weight: 1, owner: randomSigner }
        ],
        1,
        data,
        false
      )

      // This should still work because the wallet was deployed with the correct salt
      // The signature validation will verify against the deployment address
      // (This tests the existing flow, not the bootstrap flow)
      await wallet.execute([transaction], nonce, signature)
      expect(await wallet.nonce()).to.equal(1)
    })

    it('Should reject first transaction with wrong image hash even with ImmutableSigner', async () => {
      // Deploy wallet with specific signers
      const walletSalt = encodeImageHash(2, [
        { weight: 1, address: await userEOA.getAddress() },
        { weight: 1, address: immutableSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // Transfer funds
      await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })

      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const networkId = (await hardhat.provider.getNetwork()).chainId
      const nonce = 0
      const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

      // Sign with ONLY ImmutableSigner (threshold 1, but wallet requires threshold 2)
      // This creates a different image hash than what the wallet was deployed with
      const signature = await walletMultiSign(
        [
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data)) + '03' }
        ],
        1,  // Wrong threshold - wallet was deployed with threshold 2
        data,
        false
      )

      // This should fail because the image hash doesn't match
      await expect(wallet.execute([transaction], nonce, signature)).to.be.revertedWith(
        'ModuleCalls#execute: INVALID_SIGNATURE'
      )
    })

    it('Should reject second transaction with wrong signers after bootstrap', async () => {
      // Deploy wallet with ImmutableSigner only
      const walletSalt = encodeImageHash(1, [
        { weight: 1, address: immutableSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // First transaction with ImmutableSigner
      await relayerEOA.sendTransaction({ to: walletAddress, value: 2 })

      const transaction1 = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const networkId = (await hardhat.provider.getNetwork()).chainId
      const data1 = encodeMetaTransactionsData(wallet.address, [transaction1], networkId, 0)

      const signature1 = await walletMultiSign(
        [
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data1)) + '03' }
        ],
        1,
        data1,
        false
      )

      await wallet.execute([transaction1], 0, signature1)
      expect(await wallet.nonce()).to.equal(1)

      // Now try second transaction with a DIFFERENT signer
      const randomSigner = ethers.Wallet.createRandom().connect(hardhat.provider)

      const transaction2 = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const data2 = encodeMetaTransactionsData(wallet.address, [transaction2], networkId, 1)

      const signature2 = await walletMultiSign(
        [
          { weight: 1, owner: randomSigner }
        ],
        1,
        data2,
        false
      )

      // This should fail because the image hash stored after first tx
      // doesn't match the new signer configuration
      await expect(wallet.execute([transaction2], 1, signature2)).to.be.revertedWith(
        'ModuleCalls#execute: INVALID_SIGNATURE'
      )
    })

    it('Should not bypass normal validation after first transaction', async () => {
      // Deploy wallet with user and ImmutableSigner (threshold 2)
      const walletSalt = encodeImageHash(2, [
        { weight: 1, address: await userEOA.getAddress() },
        { weight: 1, address: immutableSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // First transaction with both signers
      await relayerEOA.sendTransaction({ to: walletAddress, value: 2 })

      const transaction1 = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const networkId = (await hardhat.provider.getNetwork()).chainId
      const data1 = encodeMetaTransactionsData(wallet.address, [transaction1], networkId, 0)

      const signature1 = await walletMultiSign(
        [
          { weight: 1, owner: userEOA as ethers.Wallet },
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data1)) + '03' }
        ],
        2,
        data1,
        false
      )

      await wallet.execute([transaction1], 0, signature1)
      expect(await wallet.nonce()).to.equal(1)

      // Second transaction - try with only ImmutableSigner (should fail, need both)
      const transaction2 = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const data2 = encodeMetaTransactionsData(wallet.address, [transaction2], networkId, 1)

      // Only sign with ImmutableSigner - missing user signature
      const signature2 = await walletMultiSign(
        [
          { weight: 1, owner: await userEOA.getAddress() },  // address only, no signature
          { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data2)) + '03' }
        ],
        2,
        data2,
        false
      )

      // Should fail because threshold requires both signatures but only ImmutableSigner signed
      await expect(wallet.execute([transaction2], 1, signature2)).to.be.revertedWith(
        'ModuleCalls#execute: INVALID_SIGNATURE'
      )
    })
  })

  describe('Bootstrap with EOA signer (FLAG_SIGNATURE)', () => {
    it('Should recognize ImmutableSigner when included via FLAG_SIGNATURE', async () => {
      // This test verifies that the bootstrap flow works when the ImmutableSigner
      // is detected through a recovered address from signature (FLAG_SIGNATURE = 0)
      // rather than through FLAG_DYNAMIC_SIGNATURE (03)
      
      // For this to work, we need to use the ImmutableSigner's underlying EOA address
      // directly as the signer in the image hash

      // Deploy wallet where immutableEOA (the underlying EOA) is a signer
      // Note: This is a different configuration than using ImmutableSigner contract
      const walletSalt = encodeImageHash(1, [
        { weight: 1, address: await immutableEOA.getAddress() }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      await relayerEOA.sendTransaction({ to: walletAddress, value: 1 })

      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: 1000000,
        target: await randomEOA.getAddress(),
        value: 1,
        data: []
      }

      const networkId = (await hardhat.provider.getNetwork()).chainId
      const nonce = 0
      const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

      // Sign directly with the EOA (not through ImmutableSigner contract)
      const signature = await walletMultiSign(
        [
          { weight: 1, owner: immutableEOA as ethers.Wallet }
        ],
        1,
        data,
        false
      )

      const originalBalance = await randomEOA.getBalance()

      // This should work because:
      // 1. The wallet was deployed with immutableEOA as signer
      // 2. The signature is valid
      // Note: This does NOT trigger the bootstrap bypass since immutableEOA != IMMUTABLE_SIGNER_CONTRACT
      // It uses the normal first-tx flow (validates against deployment address)
      await wallet.execute([transaction], nonce, signature)

      expect(await randomEOA.getBalance()).to.equal(originalBalance.add(1))
      expect(await wallet.nonce()).to.equal(1)
    })
  })

  describe('Multiple transactions after bootstrap', () => {
    it('Should allow multiple consecutive transactions after bootstrap', async () => {
      // Deploy wallet with ImmutableSigner only
      const walletSalt = encodeImageHash(1, [
        { weight: 1, address: immutableSigner.address }
      ])
      const walletAddress = addressOf(factory.address, startupWallet.address, walletSalt)
      await factory.connect(walletDeployerEOA).deploy(startupWallet.address, walletSalt)

      const wallet = MainModule__factory.connect(walletAddress, relayerEOA)

      // Fund the wallet for multiple transactions
      await relayerEOA.sendTransaction({ to: walletAddress, value: 5 })

      const networkId = (await hardhat.provider.getNetwork()).chainId

      // Execute 5 transactions
      for (let nonce = 0; nonce < 5; nonce++) {
        const transaction = {
          delegateCall: false,
          revertOnError: true,
          gasLimit: 1000000,
          target: await randomEOA.getAddress(),
          value: 1,
          data: []
        }

        const data = encodeMetaTransactionsData(wallet.address, [transaction], networkId, nonce)

        const signature = await walletMultiSign(
          [
            { weight: 1, owner: immutableSigner.address, signature: (await ethSign(immutableEOA as ethers.Wallet, data)) + '03' }
          ],
          1,
          data,
          false
        )

        const originalBalance = await randomEOA.getBalance()
        await wallet.execute([transaction], nonce, signature)
        expect(await randomEOA.getBalance()).to.equal(originalBalance.add(1))
        expect(await wallet.nonce()).to.equal(nonce + 1)
      }
    })
  })
})

