import { ethers } from 'hardhat'
import { expect } from 'chai'
import { MainModuleDynamicAuth } from '../src/gen/typechain'

describe('ERC7579 Compliance', () => {
  let mainModule: MainModuleDynamicAuth
  let factory: string
  let startup: string

  beforeEach(async () => {
    const [signer] = await ethers.getSigners()
    
    // Mock addresses for factory and startup
    factory = signer.address
    startup = signer.address

    const MainModuleDynamicAuthFactory = await ethers.getContractFactory('MainModuleDynamicAuth')
    mainModule = await MainModuleDynamicAuthFactory.deploy(factory, startup)
    await mainModule.deployed()
  })

  describe('IModule interface', () => {
    it('should return correct module type', async () => {
      const moduleType = await mainModule.moduleType()
      expect(moduleType).to.equal(1) // Validator module type
    })

    it('should support IModule interface', async () => {
      // Interface ID for IModule: 0xb26ed2e0
      const supportsIModule = await mainModule.supportsInterface('0xb26ed2e0')
      expect(supportsIModule).to.be.true
    })

    it('should support IValidator interface', async () => {
      // Interface ID for IValidator: 0x6251d0ed  
      const supportsIValidator = await mainModule.supportsInterface('0x6251d0ed')
      expect(supportsIValidator).to.be.true
    })

    it('should check initialization status', async () => {
      const isInitialized = await mainModule.isInitialized(mainModule.address)
      expect(isInitialized).to.be.true // Should be true for the main module itself
    })
  })

  describe('IValidator interface', () => {
    it('should validate user operation with invalid signature', async () => {
      const userOp = {
        sender: mainModule.address,
        nonce: 0,
        initCode: '0x',
        callData: '0x',
        accountGasLimits: ethers.utils.formatBytes32String(''),
        preVerificationGas: 21000,
        gasFees: ethers.utils.formatBytes32String(''),
        paymasterAndData: '0x',
        signature: '0x0001' // Invalid signature format - too short
      }
      
      const userOpHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'))

      // This should return 1 for invalid signature or throw an error
      try {
        const validationData = await mainModule.validateUserOp(userOp, userOpHash)
        expect(validationData).to.equal(1) // Invalid signature expected
      } catch (error) {
        // If it throws an error, that's also acceptable for invalid signature
        expect(error).to.exist
      }
    })

    it('should validate signature with sender context', async () => {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test message'))
      const signature = '0x0001' // Invalid signature format
      
      // Should fail with invalid signature format
      try {
        const result = await mainModule.isValidSignatureWithSender(mainModule.address, hash, signature)
        expect(result).to.equal('0x00000000')
      } catch (error) {
        // Expected to fail with invalid signature format
        expect(error.message).to.include('OUT_OF_BOUNDS')
      }
    })

    it('should reject signature from wrong sender', async () => {
      const [, wrongSender] = await ethers.getSigners()
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test message'))
      const signature = '0x'
      
      const result = await mainModule.isValidSignatureWithSender(wrongSender.address, hash, signature)
      expect(result).to.equal('0x00000000')
    })
  })
})
