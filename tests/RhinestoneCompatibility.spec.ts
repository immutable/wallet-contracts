import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, Signer } from 'ethers';

describe('Rhinestone IntentExecutor Compatibility', function () {
  let account: Contract;
  let mockIntentExecutor: Contract;
  let targetContract: Contract;
  let accountExecutionLib: Contract;
  
  let owner: Signer;
  let user: Signer;
  
  let ownerAddress: string;
  let userAddress: string;

  before(async function () {
    [owner, user] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    userAddress = await user.getAddress();
  });

  beforeEach(async function () {
    // Deploy AccountExecutionLib library
    const AccountExecutionLib = await ethers.getContractFactory('AccountExecutionLib');
    accountExecutionLib = await AccountExecutionLib.deploy();
    await accountExecutionLib.deployed();
    
    // Deploy TestAccount (test version that allows direct module installation) with library linking
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

    // Deploy a mock IntentExecutor that simulates Rhinestone's behavior
    const MockIntentExecutor = await ethers.getContractFactory('MockIntentExecutor');
    mockIntentExecutor = await MockIntentExecutor.deploy();
    await mockIntentExecutor.deployed();
  });

  describe('ERC-7579 executeFromExecutor Implementation', function () {
    it('should allow installed executor modules to call executeFromExecutor', async function () {
      // Install the mock executor module on the account using test function
      const installData = '0x'; // No initialization data needed
      const installTx = await account.testInstallModule(
        2, // TYPE_EXECUTOR
        mockIntentExecutor.address,
        installData
      );
      await installTx.wait();

      // Verify the executor is installed
      const isInstalled = await account.isModuleInstalled(2, mockIntentExecutor.address, '0x');
      expect(isInstalled).to.be.true;

      // Test single execution through executeFromExecutor
      const mode = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Single mode
      const target = targetContract.address;
      const value = 0;
      const data = targetContract.interface.encodeFunctionData('testCall', [123, '0x1234']);
      
      // Encode execution calldata (target + value + data)
      const executionCalldata = ethers.utils.solidityPack(
        ['address', 'uint256', 'bytes'],
        [target, value, data]
      );

      // Call executeFromExecutor as the installed executor module
      const tx = await mockIntentExecutor.connect(owner).executeViaAccount(
        account.address,
        mode,
        executionCalldata
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('✅ Single execution through executeFromExecutor succeeded');
    });

    it('should support batch execution through executeFromExecutor', async function () {
      // Install the executor module
      await account.testInstallModule(2, mockIntentExecutor.address, '0x');

      // Test batch execution
      const mode = '0x0100000000000000000000000000000000000000000000000000000000000000'; // Batch mode
      
      // Create batch execution data
      const executions = [
        {
          target: targetContract.address,
          value: 0,
                      data: targetContract.interface.encodeFunctionData('testCall', [123, '0x1234'])
        },
        {
          target: targetContract.address,
          value: 0,
                      data: targetContract.interface.encodeFunctionData('testCall', [123, '0x1234'])
        }
      ];

      // Encode batch execution calldata
      const executionCalldata = ethers.utils.defaultAbiCoder.encode(
        ['tuple(address target, uint256 value, bytes data)[]'],
        [executions]
      );

      // Call executeFromExecutor with batch mode
      const tx = await mockIntentExecutor.connect(owner).executeViaAccount(
        account.address,
        mode,
        executionCalldata
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('✅ Batch execution through executeFromExecutor succeeded');
    });

    it('should support delegate call execution through executeFromExecutor', async function () {
      // Install the executor module
      await account.testInstallModule(2, mockIntentExecutor.address, '0x');

      // Test delegate call execution
      const mode = '0xff00000000000000000000000000000000000000000000000000000000000000'; // DelegateCall mode
      const target = targetContract.address;
      const data = targetContract.interface.encodeFunctionData('testCall', [123, '0x1234']);
      
      // Encode delegate call execution calldata (target + data, no value)
      const executionCalldata = ethers.utils.solidityPack(
        ['address', 'bytes'],
        [target, data]
      );

      // Call executeFromExecutor with delegate call mode
      const tx = await mockIntentExecutor.connect(owner).executeViaAccount(
        account.address,
        mode,
        executionCalldata
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('✅ Delegate call execution through executeFromExecutor succeeded');
    });

    it('should reject calls from non-installed executor modules', async function () {
      // Try to call executeFromExecutor without installing the module first
      const mode = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const executionCalldata = '0x';

      // This should fail because the executor is not installed
      await expect(
        mockIntentExecutor.connect(owner).executeViaAccount(
          account.address,
          mode,
          executionCalldata
        )
      ).to.be.revertedWith('ERC7579: NOT_EXECUTOR_MODULE');

      console.log('✅ Properly rejected non-installed executor module');
    });

    it('should reject unsupported execution modes', async function () {
      // Install the executor module
      await account.testInstallModule(2, mockIntentExecutor.address, '0x');

      // Try an unsupported mode (static call mode)
      const unsupportedMode = '0xfe00000000000000000000000000000000000000000000000000000000000000';
      const executionCalldata = '0x';

      await expect(
        mockIntentExecutor.connect(owner).executeViaAccount(
          account.address,
          unsupportedMode,
          executionCalldata
        )
      ).to.be.revertedWith('ERC7579: UNSUPPORTED_MODE');

      console.log('✅ Properly rejected unsupported execution mode');
    });
  });

  describe('Rhinestone Integration Flow Simulation', function () {
    it('should simulate the complete Rhinestone IntentExecutor flow', async function () {
      console.log('\n🔄 Simulating Rhinestone IntentExecutor Integration Flow:');
      
      // Step 1: Install Rhinestone's IntentExecutor (simulated by our mock)
      console.log('1. Installing Rhinestone IntentExecutor on account...');
      await account.testInstallModule(2, mockIntentExecutor.address, '0x');
      
      const isInstalled = await account.isModuleInstalled(2, mockIntentExecutor.address, '0x');
      expect(isInstalled).to.be.true;
      console.log('   ✅ IntentExecutor installed successfully');

      // Step 2: Rhinestone infrastructure calls IntentExecutor
      console.log('2. Rhinestone infrastructure processes intent and calls IntentExecutor...');
      
      // Step 3: IntentExecutor calls account.executeFromExecutor()
      console.log('3. IntentExecutor calls account.executeFromExecutor()...');
      
      const mode = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const target = targetContract.address;
      const value = 0;
      const data = targetContract.interface.encodeFunctionData('testCall', [123, '0x1234']);
      
      const executionCalldata = ethers.utils.solidityPack(
        ['address', 'uint256', 'bytes'],
        [target, value, data]
      );

      // Step 4: Account executes the transaction on target contracts
      console.log('4. Account executes transaction on target contract...');
      
      const tx = await mockIntentExecutor.connect(owner).executeViaAccount(
        account.address,
        mode,
        executionCalldata
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      console.log('   ✅ Transaction executed successfully on target contract');
      
      console.log('\n🎉 Complete Rhinestone integration flow verified!');
      console.log('   Flow: Rhinestone → IntentExecutor → Account.executeFromExecutor() → Target Contract');
    });
  });
});
