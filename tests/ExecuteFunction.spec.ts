import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, Signer } from 'ethers';

describe('ERC7579MainModuleMinimal Execute Function', function () {
  let account: Contract;
  let targetContract: Contract;
  let accountExecutionLib: Contract;
  
  let owner: Signer;
  let user: Signer;
  let executor: Signer;
  
  let ownerAddress: string;
  let userAddress: string;
  let executorAddress: string;

  before(async function () {
    [owner, user, executor] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    userAddress = await user.getAddress();
    executorAddress = await executor.getAddress();
  });

  beforeEach(async function () {
    // Deploy AccountExecutionLib library
    const AccountExecutionLib = await ethers.getContractFactory('AccountExecutionLib');
    accountExecutionLib = await AccountExecutionLib.deploy();
    await accountExecutionLib.deployed();
    
    // Deploy TestAccount (allows direct module installation) with library linking
    const TestAccount = await ethers.getContractFactory('TestAccount', {
      libraries: {
        AccountExecutionLib: accountExecutionLib.address,
      },
    });
    account = await TestAccount.deploy(ownerAddress);
    await account.deployed();

    // Deploy a mock target contract for testing
    const MockTarget = await ethers.getContractFactory('CallReceiverMock');
    targetContract = await MockTarget.deploy();
    await targetContract.deployed();
  });

  describe('Execute Function Implementation', function () {
    it('should execute single transactions through execute function', async function () {
      console.log('\n🔄 Testing execute() function with single transaction...');
      
      // Install executor module first
      await account.testInstallModule(2, executorAddress, '0x');
      
      // Test single execution
      const mode = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Single mode
      const target = targetContract.address;
      const value = 0;
      const data = targetContract.interface.encodeFunctionData('testCall', [456, '0x5678']);
      
      // Encode execution calldata (target + value + data)
      const executionCalldata = ethers.utils.solidityPack(
        ['address', 'uint256', 'bytes'],
        [target, value, data]
      );

      // Call execute as an installed executor module
      const tx = await account.connect(executor)['execute(bytes32,bytes)'](mode, executionCalldata);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('✅ Single execution through execute() succeeded');
      
      // Verify the target contract was called
      const lastValA = await targetContract.lastValA();
      const lastValB = await targetContract.lastValB();
      expect(lastValA).to.equal(456);
      expect(lastValB).to.equal('0x5678');
      console.log('✅ Target contract state updated correctly');
    });

    it('should execute batch transactions through execute function', async function () {
      console.log('\n🔄 Testing execute() function with batch transactions...');
      
      // Install executor module
      await account.testInstallModule(2, executorAddress, '0x');
      
      // Test batch execution
      const mode = '0x0100000000000000000000000000000000000000000000000000000000000000'; // Batch mode
      
      // Create batch execution data
      const executions = [
        {
          target: targetContract.address,
          value: 0,
          data: targetContract.interface.encodeFunctionData('testCall', [111, '0xaaaa'])
        },
        {
          target: targetContract.address,
          value: 0,
          data: targetContract.interface.encodeFunctionData('testCall', [222, '0xbbbb'])
        }
      ];

      // Encode batch execution calldata
      const executionCalldata = ethers.utils.defaultAbiCoder.encode(
        ['tuple(address target, uint256 value, bytes data)[]'],
        [executions]
      );

      // Call execute with batch mode
      const tx = await account.connect(executor)['execute(bytes32,bytes)'](mode, executionCalldata);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('✅ Batch execution through execute() succeeded');
      
      // Verify the last transaction's state (batch execution overwrites)
      const lastValA = await targetContract.lastValA();
      const lastValB = await targetContract.lastValB();
      expect(lastValA).to.equal(222);
      expect(lastValB).to.equal('0xbbbb');
      console.log('✅ Batch execution completed correctly');
    });

    it('should execute delegate calls through execute function', async function () {
      console.log('\n🔄 Testing execute() function with delegate call...');
      
      // Install executor module
      await account.testInstallModule(2, executorAddress, '0x');
      
      // Test delegate call execution
      const mode = '0xff00000000000000000000000000000000000000000000000000000000000000'; // DelegateCall mode
      const target = targetContract.address;
      const data = targetContract.interface.encodeFunctionData('testCall', [789, '0x9999']);
      
      // Encode delegate call execution calldata (target + data, no value)
      const executionCalldata = ethers.utils.solidityPack(
        ['address', 'bytes'],
        [target, data]
      );

      // Call execute with delegate call mode
      const tx = await account.connect(executor)['execute(bytes32,bytes)'](mode, executionCalldata);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('✅ Delegate call execution through execute() succeeded');
    });

    it('should allow self-calls through execute function', async function () {
      console.log('\n🔄 Testing execute() function with self-call for module installation...');
      
      // Test self-call to install a module
      const mode = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Single mode
      const target = account.address;
      const value = 0;
      
      // Create calldata to install a module
      const installData = account.interface.encodeFunctionData('testInstallModule', [
        2, // TYPE_EXECUTOR
        userAddress, // Use user as mock executor
        '0x'
      ]);
      
      // Encode execution calldata for self-call
      const executionCalldata = ethers.utils.solidityPack(
        ['address', 'uint256', 'bytes'],
        [target, value, installData]
      );

      // Call execute as self (account calling itself)
      // First install owner as executor so they can make the self-call
      await account.testInstallModule(2, ownerAddress, '0x');
      const tx = await account.connect(owner)['execute(bytes32,bytes)'](mode, executionCalldata);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('✅ Self-call execution through execute() succeeded');
      
      // Verify the module was installed
      const isInstalled = await account.isModuleInstalled(2, userAddress, '0x');
      expect(isInstalled).to.be.true;
      console.log('✅ Module installed via self-call');
    });

    it('should reject execution from unauthorized callers', async function () {
      console.log('\n🔄 Testing execute() function authorization...');
      
      const mode = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const executionCalldata = '0x';

      // Should fail from unauthorized user (not self or executor module)
      await expect(
        account.connect(user)['execute(bytes32,bytes)'](mode, executionCalldata)
      ).to.be.revertedWith('AUTH');

      console.log('✅ Properly rejected unauthorized execution');
    });

    it('should reject unsupported execution modes', async function () {
      console.log('\n🔄 Testing execute() function mode validation...');
      
      // Install executor module first
      await account.testInstallModule(2, executorAddress, '0x');
      
      // Try an unsupported mode (static call mode)
      const unsupportedMode = '0xfe00000000000000000000000000000000000000000000000000000000000000';
      const executionCalldata = '0x';

      await expect(
        account.connect(executor)['execute(bytes32,bytes)'](unsupportedMode, executionCalldata)
      ).to.be.revertedWith('MODE');

      console.log('✅ Properly rejected unsupported execution mode');
    });
  });

  describe('Execute vs ExecuteFromExecutor Comparison', function () {
    it('should have identical execution behavior between execute and executeFromExecutor', async function () {
      console.log('\n🔄 Comparing execute() and executeFromExecutor() behavior...');
      
      // Deploy a mock executor that can call executeFromExecutor
      const MockExecutor = await ethers.getContractFactory('MockIntentExecutor');
      const mockExecutor = await MockExecutor.deploy();
      await mockExecutor.deployed();
      
      // Install both executors
      await account.testInstallModule(2, executorAddress, '0x');
      await account.testInstallModule(2, mockExecutor.address, '0x');
      
      const mode = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const target = targetContract.address;
      const value = 0;
      const data = targetContract.interface.encodeFunctionData('testCall', [999, '0xabcd']);
      
      const executionCalldata = ethers.utils.solidityPack(
        ['address', 'uint256', 'bytes'],
        [target, value, data]
      );

      // Test 1: Execute via execute() function
      await account.connect(executor)['execute(bytes32,bytes)'](mode, executionCalldata);
      const result1A = await targetContract.lastValA();
      const result1B = await targetContract.lastValB();
      
      // Reset target contract state
      await targetContract.testCall(0, '0x');
      
      // Test 2: Execute via executeFromExecutor() function
      await mockExecutor.executeViaAccount(account.address, mode, executionCalldata);
      const result2A = await targetContract.lastValA();
      const result2B = await targetContract.lastValB();
      
      // Results should be identical
      expect(result1A).to.equal(result2A);
      expect(result1B).to.equal(result2B);
      expect(result1A).to.equal(999);
      expect(result1B).to.equal('0xabcd');
      
      console.log('✅ Both execute() and executeFromExecutor() produce identical results');
      console.log(`   Result A: ${result1A} (both functions)`);
      console.log(`   Result B: ${result1B} (both functions)`);
    });
  });
});
