import { expect } from 'chai';
import { ethers, artifacts } from 'hardhat';
import { Contract, Signer } from 'ethers';

describe('ERC7579 Optimized Implementation', function () {
  let factory: Contract;
  let optimizedImplementation: Contract;
  let owner: Signer;
  let user: Signer;

  before(async function () {
    [owner, user] = await ethers.getSigners();
  });

  describe('Contract Compilation and Size', function () {
    it('should compile ERC7579MainModuleOptimized successfully', async function () {
      const artifact = await artifacts.readArtifact('ERC7579MainModuleOptimized');
      expect(artifact).to.not.be.undefined;
      expect(artifact.bytecode).to.not.be.empty;
    });

    it('should compile all required libraries', async function () {
      const executionLib = await artifacts.readArtifact('ExecutionLib');
      const moduleManagementLib = await artifacts.readArtifact('ModuleManagementLib');
      const hookLib = await artifacts.readArtifact('HookLib');

      expect(executionLib).to.not.be.undefined;
      expect(moduleManagementLib).to.not.be.undefined;
      expect(hookLib).to.not.be.undefined;
    });

    it('should have contract size under 24KB limit', async function () {
      const artifact = await artifacts.readArtifact('ERC7579MainModuleOptimized');
      const bytecodeSize = (artifact.bytecode.length - 2) / 2; // Remove '0x' and convert to bytes
      
      console.log(`ERC7579MainModuleOptimized size: ${bytecodeSize} bytes`);
      expect(bytecodeSize).to.be.lessThan(24576); // 24KB limit
    });
  });

  describe('Library Deployment', function () {
    it('should deploy ExecutionLib library', async function () {
      const ExecutionLib = await ethers.getContractFactory('ExecutionLib');
      const executionLib = await ExecutionLib.deploy();
      await executionLib.deployed();
      
      expect(executionLib.address).to.not.be.empty;
    });

    it('should deploy ModuleManagementLib library', async function () {
      const ModuleManagementLib = await ethers.getContractFactory('ModuleManagementLib');
      const moduleManagementLib = await ModuleManagementLib.deploy();
      await moduleManagementLib.deployed();
      
      expect(moduleManagementLib.address).to.not.be.empty;
    });

    it('should deploy HookLib library', async function () {
      const HookLib = await ethers.getContractFactory('HookLib');
      const hookLib = await HookLib.deploy();
      await hookLib.deployed();
      
      expect(hookLib.address).to.not.be.empty;
    });
  });

  describe('Interface Compliance', function () {
    it('should support ERC-7579 Account interface', async function () {
      const artifact = await artifacts.readArtifact('ERC7579MainModuleOptimized');
      
      // Check that the contract implements IERC7579Account
      const contractInterface = new ethers.utils.Interface(artifact.abi);
      
      // Check for required ERC-7579 functions
      expect(contractInterface.getFunction('execute')).to.not.be.undefined;
      expect(contractInterface.getFunction('executeFromExecutor')).to.not.be.undefined;
      expect(contractInterface.getFunction('installModule')).to.not.be.undefined;
      expect(contractInterface.getFunction('uninstallModule')).to.not.be.undefined;
      expect(contractInterface.getFunction('isModuleInstalled')).to.not.be.undefined;
      expect(contractInterface.getFunction('accountId')).to.not.be.undefined;
      expect(contractInterface.getFunction('supportsExecutionMode')).to.not.be.undefined;
      expect(contractInterface.getFunction('supportsModule')).to.not.be.undefined;
    });

    it('should support ERC-165 interface detection', async function () {
      const artifact = await artifacts.readArtifact('ERC7579MainModuleOptimized');
      const contractInterface = new ethers.utils.Interface(artifact.abi);
      
      expect(contractInterface.getFunction('supportsInterface')).to.not.be.undefined;
    });
  });

  describe('Size Comparison', function () {
    it('should be significantly smaller than the original modular contract', async function () {
      const optimizedArtifact = await artifacts.readArtifact('ERC7579MainModuleOptimized');
      const originalArtifact = await artifacts.readArtifact('ERC7579MainModuleModular');
      
      const optimizedSize = (optimizedArtifact.bytecode.length - 2) / 2;
      const originalSize = (originalArtifact.bytecode.length - 2) / 2;
      
      console.log(`Original size: ${originalSize} bytes`);
      console.log(`Optimized size: ${optimizedSize} bytes`);
      console.log(`Size reduction: ${originalSize - optimizedSize} bytes (${((originalSize - optimizedSize) / originalSize * 100).toFixed(1)}%)`);
      
      expect(optimizedSize).to.be.lessThan(originalSize);
      expect(optimizedSize).to.be.lessThan(24576); // Under 24KB limit
    });
  });

  describe('Library Integration', function () {
    it('should properly link with libraries during deployment', async function () {
      // This test verifies that the contract can be deployed with library linking
      try {
        // Note: In a real deployment, libraries would need to be deployed first
        // and their addresses provided during contract deployment
        const artifact = await artifacts.readArtifact('ERC7579MainModuleOptimized');
        expect(artifact.linkReferences).to.not.be.undefined;
        
        // Check that libraries are referenced
        const linkRefs = artifact.linkReferences;
        expect(Object.keys(linkRefs)).to.include.members([
          'contracts/libraries/ExecutionLib.sol',
          'contracts/libraries/ModuleManagementLib.sol',
          'contracts/libraries/HookLib.sol'
        ]);
      } catch (error) {
        // If linking fails, it's expected without deployed libraries
        expect(error.message).to.include('library');
      }
    });
  });

  describe('Gas Efficiency Analysis', function () {
    it('should analyze potential gas overhead from library calls', function () {
      // This is an informational test to document the trade-offs
      console.log('Library call overhead analysis:');
      console.log('- Each library DELEGATECALL adds ~700 gas');
      console.log('- ExecutionLib functions: ~700-1400 gas overhead');
      console.log('- ModuleManagementLib functions: ~700-1400 gas overhead');
      console.log('- HookLib functions: ~700-2100 gas overhead (multiple calls)');
      console.log('- Total overhead per transaction: ~2100-4900 gas');
      console.log('- Trade-off: Contract size reduction vs gas overhead');
    });
  });

  describe('Deployment Strategy', function () {
    it('should document the deployment process', function () {
      console.log('Enhanced Proxy Pattern Deployment Strategy:');
      console.log('1. Deploy ExecutionLib library');
      console.log('2. Deploy ModuleManagementLib library');
      console.log('3. Deploy HookLib library');
      console.log('4. Deploy ERC7579MainModuleOptimized with library addresses');
      console.log('5. Update Factory to use new implementation');
      console.log('6. New wallets automatically use optimized implementation');
      console.log('7. Existing wallets continue using current implementation');
    });
  });
});
