import { ethers as hardhat, web3 } from 'hardhat'
import { Contract, ContractFactory, ethers } from 'ethers'
import * as fs from 'fs'
import { expect, addressOf, encodeImageHash, encodeMetaTransactionsData, walletMultiSign } from './utils'
import { newContractFactory } from '../scripts/helper-functions'

import { 
  MultiCallDeploy, 
  MultiCallDeploy__factory,
  MainModuleDynamicAuthV2,
  MainModuleDynamicAuthV2__factory,
  IWalletProxy,
  IWalletProxy__factory
} from '../src'

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.INFO)

interface WalletDeploymentConfig {
  owners: Array<{
    address: string;
    weight: number;
    privateKey: string;
  }>;
  threshold: number;
}

interface DeploymentArtifacts {
  factory: string;
  multiCallDeploy: string;
  mainModule: string; // StartupWalletImplementationLocator for deployment
  mainModuleV2: string; // MainModuleDynamicAuthV2 expected after migration
  immutableSigner: string;
}

contract('Passport Wallet Integration', (accounts: string[]) => {
  let signer: ethers.Signer
  let executor: ethers.Signer
  let multiCallDeploy: Contract
  let artifacts: DeploymentArtifacts
  let networkId: number
  let executorAddress: string

  before(async () => {
    const signers = await hardhat.getSigners()
    console.log('Available signers:', signers.map(s => s.address ? s.address : s.getAddress ? s.getAddress() : s));
    signer = signers[0]
    // Use accounts[0] as executor since it likely has the EXECUTOR_ROLE from deployment
    executor = signers[0]
    executorAddress = await executor.getAddress()
    networkId = (await hardhat.provider.getNetwork()).chainId
    
    // Load deployment artifacts from step files
    artifacts = loadDeploymentArtifacts()
    console.log('Loaded deployment artifacts:', JSON.stringify(artifacts, null, 2));
    
    // Attach to contract
    const contractFactory: ContractFactory = await newContractFactory(executor, "MultiCallDeploy");

    console.log(`[${networkId}] Confirm contract address ${artifacts.multiCallDeploy} ...`);
    multiCallDeploy = await contractFactory.attach(artifacts.multiCallDeploy);

    console.log(`Connected to MultiCallDeploy at: ${artifacts.multiCallDeploy}`)
    console.log(`Executor address: ${executorAddress}`)
    console.log(`Network ID: ${networkId}`)

    // Obtain the executor role reference
    const executorRole = await multiCallDeploy.connect(executor).EXECUTOR_ROLE();
    console.log(`[${networkId}] Executor role ${executorRole}`);
    
    // Verify executor has the required role
    try {
      const executorRole = await multiCallDeploy.connect(executor).EXECUTOR_ROLE()
      const hasRole = await multiCallDeploy.connect(executor).hasRole(executorRole, executorAddress)
      console.log(`Executor has EXECUTOR_ROLE: ${hasRole}`)
      
      if (!hasRole) {
        console.log(`⚠️  Warning: Executor does not have EXECUTOR_ROLE. Test may fail.`)
        console.log(`   Try running: npx hardhat run scripts/grant-executor-role.ts --network localhost`)
      }
    } catch (error) {
      console.log(`Could not verify executor role: ${error.message}`)
    }
  })

  describe('Wallet Deployment and Transaction Execution', () => {
    let walletConfig: WalletDeploymentConfig
    let salt: string
    let counterfactualAddress: string
    let recipientAddress: string

    beforeEach(async () => {
      // Generate a random wallet configuration for each test to avoid conflicts
      const randomWallet = ethers.Wallet.createRandom()
      
      walletConfig = {
        owners: [
          {
            address: randomWallet.address,
            weight: 1,
            privateKey: randomWallet.privateKey
          }
        ],
        threshold: 1
      }

      // Generate salt and counterfactual address
      salt = encodeImageHash(walletConfig.threshold, walletConfig.owners)
      counterfactualAddress = addressOf(artifacts.factory, artifacts.mainModule, salt)
      recipientAddress = accounts[2] // Use accounts[2] as recipient

      console.log(`Test wallet CFA: ${counterfactualAddress}`)
      console.log(`Wallet owner: ${randomWallet.address}`)
      console.log(`Recipient address: ${recipientAddress}`)
    })

    it('Should deploy a new Passport wallet successfully', async () => {
      // Verify wallet doesn't exist initially
      const initialCode = await hardhat.provider.getCode(counterfactualAddress)
      expect(initialCode).to.equal('0x')

      // For deployment without transactions, we still need a proper signature for empty transaction array
      const emptyTransactions: any[] = []
      const data = encodeMetaTransactionsData(counterfactualAddress, emptyTransactions, networkId, 0)
      const ownerWallet = new ethers.Wallet(walletConfig.owners[0].privateKey)
      
      const signature = await walletMultiSign(
        [{
          weight: walletConfig.owners[0].weight,
          owner: ownerWallet
        }],
        walletConfig.threshold,
        data,
        false
      )

      // Deploy wallet with proper signature for empty transactions
      const tx = await multiCallDeploy.connect(executor).deployAndExecute(
        counterfactualAddress,
        artifacts.mainModule,
        salt,
        artifacts.factory,
        emptyTransactions,
        0,  // Initial nonce
        signature, // Proper signature for empty transactions
        { gasLimit: 2000000 }
      )

      const receipt = await tx.wait()
      console.log(`Deployment gas used: ${receipt.gasUsed.toString()}`)

      // Verify wallet was deployed
      const deployedCode = await hardhat.provider.getCode(counterfactualAddress)
      expect(deployedCode).to.not.equal('0x')

      // Verify wallet proxy implementation
      const walletProxy = IWalletProxy__factory.connect(counterfactualAddress, signer)
      const implementation = await walletProxy.PROXY_getImplementation()
      console.log(`Actual implementation: ${implementation}`)
      console.log(`Expected mainModuleV2: ${artifacts.mainModuleV2}`)
      console.log(`Deployment used mainModule (StartupWalletImplementationLocator): ${artifacts.mainModule}`)
      
      // After deployment and migration, the implementation should be MainModuleV2, not StartupWalletImplementationLocator
      expect(implementation.toLowerCase()).to.equal(artifacts.mainModuleV2.toLowerCase(), `Implementation mismatch: ${implementation} !== ${artifacts.mainModuleV2}`)

      // Verify nonce by connecting to the wallet proxy (CFA), not the implementation contract
      const wallet = MainModuleDynamicAuthV2__factory.connect(counterfactualAddress, signer)
      const nonce = await wallet.nonce()
      console.log(`Wallet proxy nonce: ${nonce.toNumber()}`)
      expect(nonce.toNumber()).to.equal(1) // Nonce is 1 because _validateNonce() increments it during signature validation, even for empty transactions

      console.log('✅ Wallet deployed successfully')
    })

    it('Should fund the wallet and execute a transfer transaction', async () => {
      // First deploy the wallet with proper signature for empty transactions
      const emptyTransactions: any[] = []
      const deployData = encodeMetaTransactionsData(counterfactualAddress, emptyTransactions, networkId, 0)
      const deployOwnerWallet = new ethers.Wallet(walletConfig.owners[0].privateKey)
      
      const deploySignature = await walletMultiSign(
        [{
          weight: walletConfig.owners[0].weight,
          owner: deployOwnerWallet
        }],
        walletConfig.threshold,
        deployData,
        false
      )

      await multiCallDeploy.connect(executor).deployAndExecute(
        counterfactualAddress,
        artifacts.mainModule,
        salt,
        artifacts.factory,
        emptyTransactions,
        0,
        deploySignature,
        { gasLimit: 2000000 }
      )

      // Fund the wallet with 5 ETH
      const fundingAmount = hardhat.utils.parseEther('5')
      const fundingTx = await signer.sendTransaction({
        to: counterfactualAddress,
        value: fundingAmount,
        gasLimit: 21000
      })
      await fundingTx.wait()

      // Verify wallet balance
      const walletBalance = await hardhat.provider.getBalance(counterfactualAddress)
      expect(walletBalance).to.equal(fundingAmount)
      console.log(`Wallet funded with ${hardhat.utils.formatEther(walletBalance)} ETH`)

      // Get initial recipient balance
      const initialRecipientBalance = await hardhat.provider.getBalance(recipientAddress)

      // Prepare transfer transaction
      const transferAmount = hardhat.utils.parseEther('2')
      const transactions = [{
        delegateCall: false,
        revertOnError: true,
        gasLimit: ethers.BigNumber.from(100000),
        target: recipientAddress,
        value: transferAmount,
        data: new Uint8Array([])
      }]

      // Connect to deployed wallet and get current nonce (should be 1 after deployment)
      const wallet = MainModuleDynamicAuthV2__factory.connect(counterfactualAddress, signer)
      const currentNonce = (await wallet.nonce()).toNumber()
      console.log(`Current wallet nonce before transfer: ${currentNonce}`)

      // Generate signature for the transaction
      const data = encodeMetaTransactionsData(counterfactualAddress, transactions, networkId, currentNonce)
      const ownerWallet = new ethers.Wallet(walletConfig.owners[0].privateKey)
      
      const signature = await walletMultiSign(
        [{
          weight: walletConfig.owners[0].weight,
          owner: ownerWallet
        }],
        walletConfig.threshold,
        data,
        false
      )

      // Execute the transaction using MultiCallDeploy (wallet already exists)
      const executeTx = await multiCallDeploy.connect(executor).deployAndExecute(
        counterfactualAddress,
        artifacts.mainModule,
        salt,
        artifacts.factory,
        transactions,
        currentNonce,
        signature,
        { gasLimit: 2000000 }
      )

      const executeReceipt = await executeTx.wait()
      console.log(`Transaction execution gas used: ${executeReceipt.gasUsed.toString()}`)

      // Verify transaction effects
      const finalWalletBalance = await hardhat.provider.getBalance(counterfactualAddress)
      const finalRecipientBalance = await hardhat.provider.getBalance(recipientAddress)
      const finalNonce = (await wallet.nonce()).toNumber()

      // Assertions
      expect(finalWalletBalance).to.equal(walletBalance.sub(transferAmount))
      expect(finalRecipientBalance).to.equal(initialRecipientBalance.add(transferAmount))
      expect(finalNonce).to.equal(currentNonce + 1)

      console.log(`✅ Transfer completed: ${hardhat.utils.formatEther(transferAmount)} ETH`)
      console.log(`   Wallet balance: ${hardhat.utils.formatEther(finalWalletBalance)} ETH`)
      console.log(`   Recipient balance: ${hardhat.utils.formatEther(finalRecipientBalance)} ETH`)
      console.log(`   Wallet nonce: ${finalNonce}`)
    })

    it('Should deploy wallet and execute transaction in single call', async () => {
      // Use a different salt to create a new wallet address
      const newWalletConfig = {
        owners: [
          {
            address: accounts[3], // Different account
            weight: 1,
            privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' // hardhat accounts[3]
          }
        ],
        threshold: 1
      }

      const newSalt = encodeImageHash(newWalletConfig.threshold, newWalletConfig.owners)
      const newCFA = addressOf(artifacts.factory, artifacts.mainModule, newSalt)

      // Verify wallet doesn't exist
      const initialCode = await hardhat.provider.getCode(newCFA)
      expect(initialCode).to.equal('0x')

      // Fund the counterfactual address before deployment
      const fundingAmount = hardhat.utils.parseEther('3')
      const fundingTx = await signer.sendTransaction({
        to: newCFA,
        value: fundingAmount,
        gasLimit: 21000
      })
      await fundingTx.wait()

      // Prepare initial transaction to execute after deployment
      const transferAmount = hardhat.utils.parseEther('1')
      const transactions = [{
        delegateCall: false,
        revertOnError: true,
        gasLimit: ethers.BigNumber.from(100000),
        target: recipientAddress,
        value: transferAmount,
        data: new Uint8Array([])
      }]

      // Generate signature for nonce 0 (new wallet)
      const data = encodeMetaTransactionsData(newCFA, transactions, networkId, 0)
      const ownerWallet = new ethers.Wallet(newWalletConfig.owners[0].privateKey)
      
      const signature = await walletMultiSign(
        [{
          weight: newWalletConfig.owners[0].weight,
          owner: ownerWallet
        }],
        newWalletConfig.threshold,
        data,
        false
      )

      // Get initial recipient balance
      const initialRecipientBalance = await hardhat.provider.getBalance(recipientAddress)

      // Deploy wallet and execute transaction in single call
      const tx = await multiCallDeploy.connect(executor).deployAndExecute(
        newCFA,
        artifacts.mainModule,
        newSalt,
        artifacts.factory,
        transactions,
        0, // Initial nonce for new wallet
        signature,
        { gasLimit: 3000000 }
      )

      const receipt = await tx.wait()
      console.log(`Deploy + execute gas used: ${receipt.gasUsed.toString()}`)

      // Verify wallet was deployed and transaction executed
      const deployedCode = await hardhat.provider.getCode(newCFA)
      expect(deployedCode).to.not.equal('0x')

      // Connect to deployed wallet and verify state
      const wallet = MainModuleDynamicAuthV2__factory.connect(newCFA, signer)
      const finalNonce = (await wallet.nonce()).toNumber()
      const finalWalletBalance = await hardhat.provider.getBalance(newCFA)
      const finalRecipientBalance = await hardhat.provider.getBalance(recipientAddress)

      // Assertions
      expect(finalNonce).to.equal(1) // Nonce should be incremented
      expect(finalWalletBalance).to.equal(fundingAmount.sub(transferAmount))
      expect(finalRecipientBalance).to.equal(initialRecipientBalance.add(transferAmount))

      // Verify proxy implementation
      const walletProxy = IWalletProxy__factory.connect(newCFA, signer)
      const implementation = await walletProxy.PROXY_getImplementation()
      expect(implementation.toLowerCase()).to.equal(artifacts.mainModuleV2.toLowerCase())

      console.log('✅ Wallet deployed and transaction executed in single call')
      console.log(`   Final wallet balance: ${hardhat.utils.formatEther(finalWalletBalance)} ETH`)
      console.log(`   Final nonce: ${finalNonce}`)
    })

    it('Should handle multiple transactions in sequence', async () => {
      // Deploy wallet first with proper signature
      const emptyTransactions: any[] = []
      const deployData = encodeMetaTransactionsData(counterfactualAddress, emptyTransactions, networkId, 0)
      const multiTxOwnerWallet = new ethers.Wallet(walletConfig.owners[0].privateKey)
      
      const deploySignature = await walletMultiSign(
        [{
          weight: walletConfig.owners[0].weight,
          owner: multiTxOwnerWallet
        }],
        walletConfig.threshold,
        deployData,
        false
      )

      await multiCallDeploy.connect(executor).deployAndExecute(
        counterfactualAddress,
        artifacts.mainModule,
        salt,
        artifacts.factory,
        emptyTransactions,
        0,
        deploySignature,
        { gasLimit: 2000000 }
      )

      // Fund wallet
      const fundingAmount = hardhat.utils.parseEther('10')
      await signer.sendTransaction({
        to: counterfactualAddress,
        value: fundingAmount,
        gasLimit: 21000
      })

      const wallet = MainModuleDynamicAuthV2__factory.connect(counterfactualAddress, signer)
      let currentNonce = (await wallet.nonce()).toNumber()
      console.log(`Initial nonce after deployment: ${currentNonce}`)

      // Execute first transaction
      const firstTransferAmount = hardhat.utils.parseEther('2')
      const firstTransactions = [{
        delegateCall: false,
        revertOnError: true,
        gasLimit: ethers.BigNumber.from(100000),
        target: recipientAddress,
        value: firstTransferAmount,
        data: new Uint8Array([])
      }]

      let data = encodeMetaTransactionsData(counterfactualAddress, firstTransactions, networkId, currentNonce)
      let ownerWallet = new ethers.Wallet(walletConfig.owners[0].privateKey)
      let signature = await walletMultiSign([{ weight: 1, owner: ownerWallet }], 1, data, false)

      await multiCallDeploy.connect(executor).deployAndExecute(
        counterfactualAddress,
        artifacts.mainModule,
        salt,
        artifacts.factory,
        firstTransactions,
        currentNonce,
        signature,
        { gasLimit: 2000000 }
      )

      // Verify first transaction
      currentNonce = (await wallet.nonce()).toNumber()
      console.log(`Nonce after first transaction: ${currentNonce}`)
      expect(currentNonce).to.equal(2) // Should be 2: 1 from deployment + 1 from first transaction

      // Execute second transaction
      const secondTransferAmount = hardhat.utils.parseEther('3')
      const secondTransactions = [{
        delegateCall: false,
        revertOnError: true,
        gasLimit: ethers.BigNumber.from(100000),
        target: accounts[4], // Different recipient
        value: secondTransferAmount,
        data: new Uint8Array([])
      }]

      data = encodeMetaTransactionsData(counterfactualAddress, secondTransactions, networkId, currentNonce)
      signature = await walletMultiSign([{ weight: 1, owner: ownerWallet }], 1, data, false)

      await multiCallDeploy.connect(executor).deployAndExecute(
        counterfactualAddress,
        artifacts.mainModule,
        salt,
        artifacts.factory,
        secondTransactions,
        currentNonce,
        signature,
        { gasLimit: 2000000 }
      )

      // Final verification
      const finalNonce = (await wallet.nonce()).toNumber()
      const finalBalance = await hardhat.provider.getBalance(counterfactualAddress)
      
      console.log(`Final nonce after second transaction: ${finalNonce}`)
      expect(finalNonce).to.equal(3) // Should be 3: 1 from deployment + 1 from first transaction + 1 from second transaction
      expect(finalBalance).to.equal(fundingAmount.sub(firstTransferAmount).sub(secondTransferAmount))

      console.log('✅ Multiple transactions executed successfully')
      console.log(`   Final nonce: ${finalNonce}`)
      console.log(`   Remaining balance: ${hardhat.utils.formatEther(finalBalance)} ETH`)
    })
  })

  // Helper function to load deployment artifacts
  function loadDeploymentArtifacts(): DeploymentArtifacts {
    try {
      const step1 = JSON.parse(fs.readFileSync('scripts/v2/step1.json', 'utf8'))
      const step3 = JSON.parse(fs.readFileSync('scripts/v2/step3.json', 'utf8'))
      const step4 = JSON.parse(fs.readFileSync('scripts/v2/step4.json', 'utf8'))
      const step5 = JSON.parse(fs.readFileSync('scripts/v2/step5.json', 'utf8'))
      
      return {
        factory: step1.factory,
        multiCallDeploy: step1.multiCallDeploy,
        mainModule: step3.startupWalletImpl, // StartupWalletImplementationLocator for deployment (matches wallet-deployment.ts)
        mainModuleV2: step4.mainModuleDynamicAuthV2, // MainModuleDynamicAuthV2 expected after migration
        immutableSigner: step5.immutableSigner,
      }
    } catch (error) {
      throw new Error('Failed to load deployment artifacts. Make sure step1, step3, step4 and step5 have been completed.')
    }
  }
})
