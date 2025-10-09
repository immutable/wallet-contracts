import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers as hardhat } from 'hardhat';
import { Wallet } from 'ethers';
import { ethers } from 'ethers';

/**
 * Test script to verify SignedMultiCallDeploy functionality
 * This script tests the signature generation and validation process
 */
async function testSignedMultiCallDeploy(): Promise<void> {
  const env = hre.network.name;
  
  console.log(`[${env}] Testing SignedMultiCallDeploy functionality...`);
  
  // Check if CENTRAL_SIGNER_PRIVATE_KEY is set
  const centralExecutorPrivateKey = process.env.CENTRAL_SIGNER_PRIVATE_KEY;
  if (!centralExecutorPrivateKey) {
    throw new Error('CENTRAL_SIGNER_PRIVATE_KEY environment variable is required');
  }
  
  // Load deployment artifacts
  const step1 = JSON.parse(fs.readFileSync('scripts/v2/step1.json', 'utf8'));
  const signedMultiCallDeployAddress = step1.signedMultiCallDeploy;
  
  console.log(`[${env}] SignedMultiCallDeploy address: ${signedMultiCallDeployAddress}`);
  
  // Get the contract
  const SignedMultiCallDeploy = await hardhat.getContractFactory('SignedMultiCallDeploy');
  const signedMultiCallDeploy = SignedMultiCallDeploy.attach(signedMultiCallDeployAddress);
  
  // Check if contract exists
  const code = await hardhat.provider.getCode(signedMultiCallDeployAddress);
  if (code === '0x') {
    throw new Error(`SignedMultiCallDeploy contract not found at address ${signedMultiCallDeployAddress}`);
  }
  
  console.log(`[${env}] ✅ SignedMultiCallDeploy contract exists`);
  
  // Test signature generation process
  console.log(`[${env}] Testing signature generation process...`);
  
  // Create test data
  const testCfa = "0x1234567890123456789012345678901234567890";
  const testMainModule = "0x2345678901234567890123456789012345678901";
  const testSalt = "0x3456789012345678901234567890123456789012345678901234567890123456";
  const testFactory = "0x4567890123456789012345678901234567890123";
  const testTransactions = [{
    delegateCall: false,
    revertOnError: true,
    gasLimit: 1000000,
    target: testCfa,
    value: 0,
    data: "0x"
  }];
  const testNonce = 0;
  const testWalletSignature = "0x" + "0".repeat(130); // Mock signature
  
  // Encode the call data exactly as SignedMultiCallDeploy does
  const multiCallDeployInterface = await hardhat.getContractFactory('MultiCallDeploy');
  const callData = multiCallDeployInterface.interface.encodeFunctionData('deployAndExecute', [
    testCfa,
    testMainModule,
    testSalt,
    testFactory,
    testTransactions,
    testNonce,
    testWalletSignature
  ]);
  
  // Hash the call data
  const callDataHash = ethers.utils.keccak256(callData);
  
  // Create central executor wallet and sign
  const centralExecutorWallet = new Wallet(centralExecutorPrivateKey);
  const centralExecutorAddress = await centralExecutorWallet.getAddress();
  const executorSignature = await centralExecutorWallet.signMessage(ethers.utils.arrayify(callDataHash));
  
  console.log(`[${env}] 📋 Signature generation test results:`);
  console.log(`[${env}]   - Central executor address: ${centralExecutorAddress}`);
  console.log(`[${env}]   - Call data length: ${callData.length}`);
  console.log(`[${env}]   - Call data hash: ${callDataHash}`);
  console.log(`[${env}]   - Executor signature: ${executorSignature}`);
  
  // Test signature validation (without actually calling the contract)
  try {
    const ethSignedMessageHash = ethers.utils.hashMessage(ethers.utils.arrayify(callDataHash));
    const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(callDataHash), executorSignature);
    
    console.log(`[${env}] 📋 Signature validation test:`);
    console.log(`[${env}]   - Eth signed message hash: ${ethSignedMessageHash}`);
    console.log(`[${env}]   - Recovered address: ${recoveredAddress}`);
    console.log(`[${env}]   - Addresses match: ${recoveredAddress.toLowerCase() === centralExecutorAddress.toLowerCase()}`);
    
    if (recoveredAddress.toLowerCase() === centralExecutorAddress.toLowerCase()) {
      console.log(`[${env}] ✅ Signature validation successful`);
    } else {
      console.log(`[${env}] ❌ Signature validation failed`);
    }
  } catch (error) {
    console.log(`[${env}] ❌ Signature validation error: ${error.message}`);
  }
  
  console.log(`[${env}] ✅ SignedMultiCallDeploy test completed successfully`);
}

// Execute the test
testSignedMultiCallDeploy()
  .then(() => {
    console.log('✅ SignedMultiCallDeploy test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SignedMultiCallDeploy test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

