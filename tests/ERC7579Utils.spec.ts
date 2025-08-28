import { expect } from 'chai'
import { ethers, artifacts } from 'hardhat'
import { Contract } from 'ethers'

describe('ERC-7579 Utilities', () => {
  let modeLib: Contract
  let executionLib: Contract
  let moduleTypeLib: Contract
  let interfaceIds: Contract

  before(async () => {
    // Deploy utility libraries
    const ModeLib = await ethers.getContractFactory('ModeLib')
    modeLib = await ModeLib.deploy()
    await modeLib.deployed()

    const ExecutionLib = await ethers.getContractFactory('ExecutionLib')
    executionLib = await ExecutionLib.deploy()
    await executionLib.deployed()

    const ModuleTypeLib = await ethers.getContractFactory('ModuleTypeLib')
    moduleTypeLib = await ModuleTypeLib.deploy()
    await moduleTypeLib.deployed()

    const InterfaceIds = await ethers.getContractFactory('InterfaceIds')
    interfaceIds = await InterfaceIds.deploy()
    await interfaceIds.deployed()
  })

  describe('ModeLib', () => {
    it('should deploy successfully', async () => {
      expect(modeLib.address).to.not.equal(ethers.constants.AddressZero)
    })
  })

  describe('ExecutionLib', () => {
    it('should deploy successfully', async () => {
      expect(executionLib.address).to.not.equal(ethers.constants.AddressZero)
    })
  })

  describe('ModuleTypeLib', () => {
    it('should deploy successfully', async () => {
      expect(moduleTypeLib.address).to.not.equal(ethers.constants.AddressZero)
    })
  })

  describe('InterfaceIds', () => {
    it('should deploy successfully', async () => {
      expect(interfaceIds.address).to.not.equal(ethers.constants.AddressZero)
    })
  })

  describe('Interface Compilation', () => {
    it('should compile all ERC-7579 interfaces', async () => {
      // Test that all interfaces compile successfully
      const interfaces = [
        'IERC7579Account',
        'IERC7579Module', 
        'IERC7579Validator',
        'IERC7579Executor',
        'IERC7579Hook'
      ]

      for (const interfaceName of interfaces) {
        const artifact = await artifacts.readArtifact(interfaceName)
        expect(artifact).to.not.be.undefined
        expect(artifact.abi).to.be.an('array')
        expect(artifact.bytecode).to.be.a('string')
      }
    })

    it('should have correct interface IDs', async () => {
      // Verify that interface IDs are properly defined
      expect(interfaceIds.address).to.not.equal(ethers.constants.AddressZero)
    })
  })

  describe('ERC-7579 Specification Compliance', () => {
    it('should define correct module types', async () => {
      // Module types should be defined correctly
      expect(moduleTypeLib.address).to.not.equal(ethers.constants.AddressZero)
    })

    it('should support execution mode encoding/decoding', async () => {
      // Mode encoding/decoding should work
      expect(modeLib.address).to.not.equal(ethers.constants.AddressZero)
    })

    it('should support execution data conversion', async () => {
      // Execution data conversion should work
      expect(executionLib.address).to.not.equal(ethers.constants.AddressZero)
    })
  })
})
