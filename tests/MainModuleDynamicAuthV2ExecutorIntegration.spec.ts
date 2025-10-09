import { expect } from 'chai'
import * as ethers from 'ethers'
import { ethers as hardhat, web3 } from 'hardhat'

import {
  MockExecutor__factory,
  MockUnregisteredExecutor__factory,
  MockCallReceiver__factory
} from '../src/gen/typechain'

import {
  MockExecutor,
  MockUnregisteredExecutor,
  MockCallReceiver
} from '../src/gen/typechain'

// Import test utilities
import { createTestWallet, RevertError } from './utils/helpers'

// Constants from the contract
const MODULE_TYPE_EXECUTOR = 2
const CALLTYPE_SINGLE = 0
const CALLTYPE_BATCH = 1
const EXECTYPE_DEFAULT = 0
const EXECTYPE_TRY = 1

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

contract('MainModuleDynamicAuthV2 - Executor Integration', (accounts: string[]) => {
  let signer: ethers.Signer
  let wallet: ethers.Wallet
  let mockExecutor: MockExecutor
  let unregisteredExecutor: MockUnregisteredExecutor
  let callReceiver: MockCallReceiver

  const networkId = 127001 // Ganache network ID from package.json

  describe('Mock Executor Module Tests', () => {
    before(async () => {
      signer = (await hardhat.getSigners())[0]
      const testWallet = createTestWallet(web3, 0)
      wallet = testWallet.wallet
      
      // Deploy mock contracts
      mockExecutor = await new MockExecutor__factory().connect(signer).deploy()
      unregisteredExecutor = await new MockUnregisteredExecutor__factory().connect(signer).deploy()
      callReceiver = await new MockCallReceiver__factory().connect(signer).deploy()
    })

    beforeEach(async () => {
      // Reset call receiver state before each test
      await callReceiver.reset()
    })

    describe('Scenario #1: Mock Executor Module Interface Tests', () => {
      it('should correctly implement IExecutor interface', async () => {
        // Test isModuleType function
        const isExecutorType = await mockExecutor.isModuleType(MODULE_TYPE_EXECUTOR)
        expect(isExecutorType).to.be.true

        // Test with wrong module type
        const isValidatorType = await mockExecutor.isModuleType(1) // MODULE_TYPE_VALIDATOR
        expect(isValidatorType).to.be.false
      })

      it('should handle module installation and initialization', async () => {
        const testData = ethers.utils.defaultAbiCoder.encode(['string'], ['test-install-data'])
        
        // Test onInstall
        const tx = await mockExecutor.onInstall(testData)
        const receipt = await tx.wait()

        // Check for ModuleInstalled event
        const moduleInstalledEvent = receipt.events?.find(e => e.event === 'ModuleInstalled')
        expect(moduleInstalledEvent).to.exist
        expect(moduleInstalledEvent?.args?.smartAccount).to.equal(signer.address) // msg.sender in onInstall
        expect(moduleInstalledEvent?.args?.data).to.equal(testData)

        // Check initialization status
        const signerAddress = await signer.getAddress()
        const isInitialized = await mockExecutor.isInitialized(signerAddress)
        expect(isInitialized).to.be.true
      })

      it('should handle module uninstallation', async () => {
        const testData = ethers.utils.defaultAbiCoder.encode(['string'], ['test-uninstall-data'])
        
        // First install
        await mockExecutor.onInstall('0x')
        
        // Then uninstall
        const tx = await mockExecutor.onUninstall(testData)
        const receipt = await tx.wait()

        // Check for ModuleUninstalled event
        const moduleUninstalledEvent = receipt.events?.find(e => e.event === 'ModuleUninstalled')
        expect(moduleUninstalledEvent).to.exist
        expect(moduleUninstalledEvent?.args?.smartAccount).to.equal(signer.address)
        expect(moduleUninstalledEvent?.args?.data).to.equal(testData)

        // Check initialization status
        const signerAddress = await signer.getAddress()
        const isInitialized = await mockExecutor.isInitialized(signerAddress)
        expect(isInitialized).to.be.false
      })
    })

    describe('Scenario #2A: Execution Calldata Creation Tests', () => {
      it('should create single execution calldata correctly', async () => {
        const target = callReceiver.address
        const value = ethers.utils.parseEther('0.1')
        const data = callReceiver.interface.encodeFunctionData('receiveCall', ['0x1234'])

        const executionCalldata = await mockExecutor.createSingleExecutionCalldata(target, value, data)
        
        // Decode and verify the calldata
        const decoded = ethers.utils.defaultAbiCoder.decode(['address', 'uint256', 'bytes'], executionCalldata)
        expect(decoded[0]).to.equal(target)
        expect(decoded[1]).to.equal(value)
        expect(decoded[2]).to.equal(data)
      })

      it('should create batch execution calldata correctly', async () => {
        const targets = [callReceiver.address, callReceiver.address]
        const values = [0, ethers.utils.parseEther('0.05')]
        const callDatas = [
          callReceiver.interface.encodeFunctionData('receiveCallWithParams', [1, 'first']),
          callReceiver.interface.encodeFunctionData('receiveCallWithParams', [2, 'second'])
        ]

        const executionCalldata = await mockExecutor.createBatchExecutionCalldata(targets, values, callDatas)
        
        // Decode and verify the batch calldata
        const decoded = ethers.utils.defaultAbiCoder.decode(['bytes[]'], executionCalldata)
        const executions = decoded[0]
        
        expect(executions).to.have.length(2)
        
        // Verify first execution
        const firstExecution = ethers.utils.defaultAbiCoder.decode(['address', 'uint256', 'bytes'], executions[0])
        expect(firstExecution[0]).to.equal(targets[0])
        expect(firstExecution[1]).to.equal(values[0])
        expect(firstExecution[2]).to.equal(callDatas[0])
        
        // Verify second execution
        const secondExecution = ethers.utils.defaultAbiCoder.decode(['address', 'uint256', 'bytes'], executions[1])
        expect(secondExecution[0]).to.equal(targets[1])
        expect(secondExecution[1]).to.equal(values[1])
        expect(secondExecution[2]).to.equal(callDatas[1])
      })

      it('should reject batch execution with mismatched array lengths', async () => {
        const targets = [callReceiver.address, callReceiver.address]
        const values = [0] // Mismatched length
        const callDatas = [
          callReceiver.interface.encodeFunctionData('receiveCall', ['0x1234']),
          callReceiver.interface.encodeFunctionData('receiveCall', ['0x5678'])
        ]

        await expect(
          mockExecutor.createBatchExecutionCalldata(targets, values, callDatas)
        ).to.be.revertedWith('Array length mismatch')
      })
    })

    describe('Mock Call Receiver Tests', () => {
      it('should receive and track simple calls', async () => {
        const testData = '0x1234'
        
        const tx = await callReceiver.receiveCall(testData)
        const receipt = await tx.wait()

        // Check event was emitted
        const callEvent = receipt.events?.find(e => e.event === 'CallReceived')
        expect(callEvent).to.exist
        expect(callEvent?.args?.caller).to.equal(signer.address)
        expect(callEvent?.args?.value).to.equal(0)
        expect(callEvent?.args?.data).to.equal(testData)
        expect(callEvent?.args?.callNumber).to.equal(1)

        // Check state was updated
        const [callCount, lastCaller, lastValue, lastData] = await callReceiver.getState()
        expect(callCount).to.equal(1)
        expect(lastCaller).to.equal(signer.address)
        expect(lastValue).to.equal(0)
        expect(lastData).to.equal(testData)
      })

      it('should receive calls with parameters', async () => {
        const param1 = 42
        const param2 = 'test-string'
        
        const tx = await callReceiver.receiveCallWithParams(param1, param2, { value: ethers.utils.parseEther('0.1') })
        const receipt = await tx.wait()

        // Check event was emitted
        const callEvent = receipt.events?.find(e => e.event === 'CallReceived')
        expect(callEvent).to.exist
        expect(callEvent?.args?.caller).to.equal(signer.address)
        expect(callEvent?.args?.value).to.equal(ethers.utils.parseEther('0.1'))
        expect(callEvent?.args?.callNumber).to.equal(1)

        // Check state was updated with encoded parameters
        const [callCount, lastCaller, lastValue, lastData] = await callReceiver.getState()
        expect(callCount).to.equal(1)
        expect(lastCaller).to.equal(signer.address)
        expect(lastValue).to.equal(ethers.utils.parseEther('0.1'))
        
        // Decode and verify parameters
        const decodedData = ethers.utils.defaultAbiCoder.decode(['uint256', 'string'], lastData)
        expect(decodedData[0]).to.equal(param1)
        expect(decodedData[1]).to.equal(param2)
      })

      it('should handle failing calls', async () => {
        await expect(callReceiver.failingCall()).to.be.revertedWith('MockCallReceiver: Intentional failure')
      })

      it('should reset state correctly', async () => {
        // Make a call first
        await callReceiver.receiveCall('0x1234')
        
        // Verify state is set
        let [callCount] = await callReceiver.getState()
        expect(callCount).to.equal(1)
        
        // Reset
        await callReceiver.reset()
        
        // Verify state is reset
        const [newCallCount, lastCaller, lastValue, lastData] = await callReceiver.getState()
        expect(newCallCount).to.equal(0)
        expect(lastCaller).to.equal(ethers.constants.AddressZero)
        expect(lastValue).to.equal(0)
        expect(lastData).to.equal('0x')
      })

      it('should receive ETH via receive function', async () => {
        // Get initial balance
        const initialBalance = await hardhat.provider.getBalance(callReceiver.address)
        const value = ethers.utils.parseEther('0.5')
        
        const tx = await signer.sendTransaction({
          to: callReceiver.address,
          value: value
        })
        const receipt = await tx.wait()

        // Check state was updated (the receive function should have been called)
        const [callCount, lastCaller, lastValue, lastData] = await callReceiver.getState()
        expect(callCount).to.equal(1)
        expect(lastCaller).to.equal(signer.address)
        expect(lastValue).to.equal(value)
        expect(lastData).to.equal('0x')

        // Check that the contract received the additional ETH
        const finalBalance = await hardhat.provider.getBalance(callReceiver.address)
        expect(finalBalance.sub(initialBalance)).to.equal(value)
      })
    })
  })
})
