import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers as hardhat } from 'hardhat';
import { Wallet, BigNumber } from 'ethers';
import { ethers } from 'ethers';

// Import specific helper functions from utils/helpers.ts
import { 
  addressOf, 
  encodeImageHash, 
  encodeMetaTransactionsData, 
  walletMultiSign 
} from '../utils/helpers';

// Import deployment utilities
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * Unified configuration for wallet deployment
 * Supports both deployment methods and multiple initial transactions
 */
export interface WalletDeploymentConfig {
  // Wallet owner configuration
  owners: Array<{
    address: string;
    weight: number;
    privateKey: string;
  }>;
  threshold: number;
}

/**
 * This script primarily focuses on the MultiCallDeploy method which exactly matches 
 * the evm-relayer backend implementation.
 * 
 * PRIMARY METHOD - MultiCallDeploy.deployAndExecute():
 * Replicates the exact flow used by the evm-relayer service:
 * 1. evm-relayer receives wallet creation request
 * 2. Calls multiCallService.BuildAndSimulateTransaction()
 * 3. Which calls transactor.DeployAndExecute() with these exact parameters:
 *    - spec.Wallet.Address (counterfactual address)
 *    - mcs.mainModule.Address (main module)
 *    - salt32 (generated salt)
 *    - mcs.factory.Address (factory contract)
 *    - transactions (converted meta transactions)
 *    - spec.UserNonce (wallet nonce)
 *    - spec.Signature (user signature)
 * 
 */
async function deployWallet(): Promise<void> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  
  console.log(`[${network}] Starting wallet deployment...`);
  
  // Setup wallet options
  const walletOptions: WalletOptions = await newWalletOptions(env);
  const deployer = walletOptions.getWallet();
  const networkId = (await hardhat.provider.getNetwork()).chainId;

  console.log(`[${network}] Network ID: ${networkId}`);
  
  // Load deployed contract addresses (from previous deployment steps)
  const deploymentArtifacts = loadDeploymentArtifacts();

  // Configuration for the new wallet - use random owner to ensure unique salt
  const randomOwner = ethers.Wallet.createRandom();
  const walletConfig: WalletDeploymentConfig = {
    owners: [
      {
        address: randomOwner.address,
        weight: 1,
        privateKey: randomOwner.privateKey
      }
    ],
    threshold: 1,
  };
  
  console.log(`[${network}] 🎲 Generated random owner: ${randomOwner.address}`);
  console.log(`[${network}] Random owner private key: ${randomOwner.privateKey}`);
  
  console.log(`[${network}] Wallet configuration:`);
  console.log(`  - Owners: ${walletConfig.owners.length}`);
  console.log(`  - Threshold: ${walletConfig.threshold}`);
  
  // Generate wallet salt from owner configuration
  const salt = encodeImageHash(walletConfig.threshold, walletConfig.owners);
  console.log(`[${network}] Generated salt: ${salt}`);
  
  // Calculate counterfactual address (CFA)
  const cfa = addressOf(
    deploymentArtifacts.factory,
    deploymentArtifacts.mainModule,
    salt
  );
  console.log(`[${network}] Counterfactual address: ${cfa}`);
  
  // Deploy the wallet using the selected method
  console.log(`[${network}] Using MultiCallDeploy method`);

  await deployWithMultiCallDeploy(
    env,
    deploymentArtifacts,
    cfa,
    salt,
    walletConfig,
    networkId
  );
  
  // Verify deployment
  await verifyDeployment(cfa, network);
  
  console.log(`[${network}] Wallet deployment completed successfully!`);
  console.log(`[${network}] Wallet address: ${cfa}`);
}

/**
 * Load deployment artifacts from previous steps
 */
function loadDeploymentArtifacts() {
  try {
    // Try to load from step artifacts (adjust paths as needed)
    const step1 = JSON.parse(fs.readFileSync('step1.json', 'utf8'));
    const step3 = JSON.parse(fs.readFileSync('step3.json', 'utf8'));
    const step5 = JSON.parse(fs.readFileSync('step5.json', 'utf8'));
    
    return {
      factory: step1.factory,
      multiCallDeploy: step1.multiCallDeploy,
      mainModule: step3.startupWalletImpl, // mainmodule == startupWalletImpl <-- refer scripts/README.md
      immutableSigner: step5.immutableSigner,
    };
  } catch (error) {
    console.error('Failed to load deployment artifacts. Make sure step1, step3 and step5 have been completed.');
    throw error;
  }
}

/**
 * Deploy wallet using MultiCallDeploy.deployAndExecute
 * 
 * This method exactly matches the evm-relayer service implementation:
 * 1. Calls MultiCallDeploy.deployAndExecute with the same parameters as the Go service
 * 2. Handles nonce correctly (matches spec.UserNonce)
 * 3. Processes transactions in the same format (matches convertMetaTransactionToIModuleCallsTransaction)
 * 4. Uses the same parameter order and types
 */
async function deployWithMultiCallDeploy(
  env: EnvironmentInfo,
  artifacts: any,
  cfa: string,
  salt: string,
  config: WalletDeploymentConfig,
  networkId: number
) {
  console.log(`[${env.network}] =================== DEPLOYMENT START ===================`);
  console.log(`[${env.network}] 🚀 Starting wallet deployment with MultiCallDeploy.deployAndExecute`);
  console.log(`[${env.network}] 📋 Initial parameters:`);
  console.log(`[${env.network}]   - Network: ${env.network}`);
  console.log(`[${env.network}]   - Network ID: ${networkId}`);
  console.log(`[${env.network}]   - Target CFA: ${cfa}`);
  console.log(`[${env.network}]   - Salt: ${salt}`);
  console.log(`[${env.network}] ========================================================`);
  
  // Get MultiCallDeploy contract
  const MultiCallDeploy = await hardhat.getContractFactory('MultiCallDeploy');
  const multiCallDeploy = MultiCallDeploy.attach(artifacts.multiCallDeploy);
  
  // Check if MultiCallDeploy contract exists
  console.log(`[${env.network}] 🔐 Checking MultiCallDeploy contract...`);
  console.log(`[${env.network}] MultiCallDeploy address: ${artifacts.multiCallDeploy}`);
  
  // Check if contract exists
  const multiCallDeployCode = await hardhat.provider.getCode(artifacts.multiCallDeploy);
  if (multiCallDeployCode === '0x') {
    throw new Error(`MultiCallDeploy contract not found at address ${artifacts.multiCallDeploy}`);
  }
  console.log(`[${env.network}] ✅ MultiCallDeploy contract exists`);
  
  // STEP 1: Check if wallet already exists and get current nonce
  console.log(`[${env.network}] Checking wallet existence at CFA: ${cfa}`);
  const walletCode = await hardhat.provider.getCode(cfa);
  const walletExists = walletCode !== '0x';
  
  let walletNonce = 0;
  if (walletExists) {
    console.log(`[${env.network}] ⚠️  Wallet already exists at ${cfa}`);
    
    // Connect to existing wallet proxy to get current nonce
    try {
      // The CFA is a proxy that delegates to MainModuleDynamicAuth
      // We connect to the proxy using the MainModule interface
      const existingWallet = await hardhat.getContractAt('MainModuleDynamicAuth', cfa);
      
      console.log(`[${env.network}] 🔍 Connecting to wallet proxy at: ${cfa}`);
      
      // Try to get the proxy implementation to verify we're connecting correctly
      try {
        const proxyInterface = await hardhat.getContractAt('IWalletProxy', cfa);
        const implementation = await proxyInterface.PROXY_getImplementation();
        console.log(`[${env.network}] 📋 Proxy implementation: ${implementation}`);
        console.log(`[${env.network}] 📋 Expected main module: ${artifacts.mainModule}`);
        
        if (implementation.toLowerCase() === artifacts.mainModule.toLowerCase()) {
          console.log(`[${env.network}] ✅ Proxy implementation matches expected main module`);
        } else {
          console.log(`[${env.network}] ⚠️  Proxy implementation differs from expected main module`);
        }
      } catch (proxyError) {
        console.log(`[${env.network}] ℹ️  Could not read proxy implementation: ${proxyError.message}`);
      }
      
      walletNonce = (await existingWallet.nonce()).toNumber();
      console.log(`[${env.network}] ✅ Current wallet nonce: ${walletNonce}`);
    } catch (error) {
      console.log(`[${env.network}] ⚠️  Could not read wallet nonce, assuming 0. Error: ${error.message}`);
      walletNonce = 0;
    }
  } else {
    console.log(`[${env.network}] ✅ Wallet does not exist yet, will deploy with nonce 0`);
  }

  // Before wallet is initialized, send tokens from a funder account to the CFA address
  console.log(`[${env.network}] =================== WALLET FUNDING ===================`);
  
  // Get funder wallet from private key in .env (FUNDER_WALLET)
  if (!process.env.FUNDER_WALLET) {
    throw new Error("FUNDER_WALLET private key not set in .env");
  }
  const funder = new ethers.Wallet(process.env.FUNDER_WALLET, hardhat.provider);

  // Amount to fund (e.g., 0.001 ETH)
  const fundAmount = ethers.utils.parseEther("0.001");

  // Check funder's balance
  const funderBalance = await funder.getBalance();
  if (funderBalance.lt(fundAmount)) {
    throw new Error(`[${env.network}] Funder does not have enough ETH to fund the wallet`);
  }

  console.log(`[${env.network}] 💸 Funding CFA address ${cfa} with ${ethers.utils.formatEther(fundAmount)} ETH from funder ${await funder.getAddress()}`);

  const fundTx = await funder.sendTransaction({
    to: cfa,
    value: fundAmount,
    // Optionally set gas parameters if needed
    // gasLimit: process.env.GAS_LIMIT,
    // maxFeePerGas: process.env.MAX_FEE_PER_GAS,
    // maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
  });

  await fundTx.wait();

  console.log(`[${env.network}] ✅ CFA address funded successfully`);
  console.log(`[${env.network}] ========================================================`);

  // Prepare transactions to execute AFTER deployment (on the wallet)
  const transactions: any[] = [];
  
  // NOTE: Individual transaction gasLimit should be much smaller than the overall transaction gasLimit
  // The wallet's _execute function checks: require(gasleft() >= transaction.gasLimit)
  // By the time _execute runs, significant gas has already been consumed by deployment
  
  // zero value transfer to a random address
  transactions.push({
    delegateCall: false,
    revertOnError: true,
    gasLimit: BigNumber.from(200000), // Use 100K gas for simple transfer instead of process.env.GAS_LIMIT
    target: await funder.getAddress(), // can be the same funder address to return the initially funded funds
    value: ethers.utils.parseEther("0.0001"), // 0.0001 ETH
    data: new Uint8Array([])
  });
  
  // STEP 2: Create signature using the correct nonce
  console.log(`[${env.network}] ==================== NONCE DEBUG INFO ====================`);
  console.log(`[${env.network}] Wallet exists: ${walletExists}`);
  console.log(`[${env.network}] Detected wallet nonce: ${walletNonce}`);
  console.log(`[${env.network}] Network ID: ${networkId}`);
  console.log(`[${env.network}] CFA: ${cfa}`);
  console.log(`[${env.network}] Transactions count: ${transactions.length}`);
  console.log(`[${env.network}] =========================================================`);
  
  let signature = '0x';
  if (transactions.length > 0) {
    console.log(`[${env.network}] 🔐 Generating signature with nonce: ${walletNonce}`);
    
    // Log transaction details for debugging
    transactions.forEach((tx, i) => {
      console.log(`[${env.network}]   Transaction ${i}: target=${tx.target}, value=${tx.value}, gasLimit=${tx.gasLimit}`);
    });
    
    const data = encodeMetaTransactionsData(cfa, transactions, networkId, walletNonce);
    console.log(`[${env.network}] 📝 Encoded meta transaction data (first 66 chars): ${data.slice(0, 66)}...`);
    console.log(`[${env.network}] 📝 Data includes nonce: ${walletNonce} for wallet: ${cfa}`);
    
    const ownerWallets = config.owners.map(owner => {
      return new Wallet(owner.privateKey);
    });
    
    // Log signing details
    console.log(`[${env.network}] 👥 Signing with ${config.owners.length} owner(s), threshold: ${config.threshold}`);
    config.owners.forEach((owner, i) => {
      console.log(`[${env.network}]   Owner ${i}: ${owner.address} (weight: ${owner.weight})`);
    });
    
    signature = await walletMultiSign(
      config.owners.map((owner, index) => ({
        weight: owner.weight,
        owner: ownerWallets[index]
      })),
      config.threshold,
      data,
      false
    );
    
    console.log(`[${env.network}] ✅ Generated signature (length: ${signature.length}): ${signature.slice(0, 20)}...`);
  } else {
    console.log(`[${env.network}] ℹ️  No transactions to sign, using empty signature`);
  }
  
  console.log(`[${env.network}] Calling MultiCallDeploy.deployAndExecute...`);
  console.log(`[${env.network}] Parameters match evm-relayer Go service exactly:`);
  console.log(`  - CFA: ${cfa}`);
  console.log(`  - Main Module: ${artifacts.mainModule}`);
  console.log(`  - Salt: ${salt}`);
  console.log(`  - Factory: ${artifacts.factory}`);

  // Setup executor admin wallet
  const walletOptions: WalletOptions = await newWalletOptions(env);
  const executor = walletOptions.getWallet();
  
  // Get executor wallet's current nonce
  const executorAddress = await executor.getAddress();
  const currentNonce = await hardhat.provider.getTransactionCount(executorAddress);
  
  console.log(`[${env.network}] Executor wallet address: ${executorAddress}`);
  console.log(`[${env.network}] Executor wallet current nonce: ${currentNonce}`);

  const txnOpts = {
    gasLimit: BigNumber.from(process.env.GAS_LIMIT),
    maxFeePerGas: process.env.MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
    nonce: currentNonce,
  };

  // STEP 3: Enhanced pre-execution validation
  console.log(`[${env.network}] =================== PRE-EXECUTION VALIDATION ===================`);
  
  // Check all contract deployments
  console.log(`[${env.network}] 🔍 Verifying all required contracts exist...`);
  const factoryCode = await hardhat.provider.getCode(artifacts.factory);
  const mainModuleCode = await hardhat.provider.getCode(artifacts.mainModule);
  
  console.log(`[${env.network}]   - Factory exists: ${factoryCode !== '0x'}`);
  console.log(`[${env.network}]   - MainModule exists: ${mainModuleCode !== '0x'}`);
  
  if (factoryCode === '0x') {
    throw new Error(`Factory contract not found at address ${artifacts.factory}`);
  }
  if (mainModuleCode === '0x') {
    throw new Error(`MainModule contract not found at address ${artifacts.mainModule}`);
  }
  
  console.log(`[${env.network}] ✅ All required contracts exist`);
  
  // Add detailed pre-execution checks
  console.log(`[${env.network}] 🔍 Pre-execution validation:`);
  console.log(`[${env.network}]   - Signature length: ${signature.length}`);
  console.log(`[${env.network}]   - Signature first 20 bytes: ${signature.slice(0, 42)}`);
  console.log(`[${env.network}]   - Transaction data length: ${transactions[0]?.data?.length || 0}`);
  console.log(`[${env.network}]   - Gas Limit: ${txnOpts.gasLimit}`);
  console.log(`[${env.network}]   - Executor: ${executorAddress}`);
  
  // Try to call the function statically first to get better error messages
  try {
    console.log(`[${env.network}] 🔍 Testing deployAndExecute with staticCall...`);
    await multiCallDeploy.connect(executor).callStatic.deployAndExecute(
      cfa,                    // counterfactual address
      artifacts.mainModule,   // main module address
      salt,                   // salt for deployment
      artifacts.factory,      // factory contract address
      transactions,           // transactions to execute after deployment
      walletNonce,            // wallet nonce
      signature,              // signature for the transactions
      txnOpts
    );
    console.log(`[${env.network}] ✅ Static call successful`);
  } catch (staticError) {
    console.log(`[${env.network}] ❌ Static call failed:`, staticError.message);
    if (staticError.reason) {
      console.log(`[${env.network}] 💡 Static call revert reason: ${staticError.reason}`);
    }
    if (staticError.data) {
      console.log(`[${env.network}] 💡 Static call error data: ${staticError.data}`);
    }
    
    // Try to decode the error data if it exists
    if (staticError.data && staticError.data !== '0x') {
      try {
        // Try to decode as a string revert reason
        const decoded = ethers.utils.defaultAbiCoder.decode(['string'], staticError.data);
        console.log(`[${env.network}] 💡 Decoded error: ${decoded[0]}`);
      } catch (decodeError) {
        console.log(`[${env.network}] 💡 Could not decode error data as string`);
        // Try to decode as bytes4 selector + data
        if (staticError.data.length >= 10) {
          const selector = staticError.data.slice(0, 10);
          console.log(`[${env.network}] 💡 Error selector: ${selector}`);
        }
      }
    }
    throw staticError;
  }

  // Try to estimate gas first to catch revert reasons
  try {
    console.log(`[${env.network}] 🔍 Estimating gas for deployAndExecute...`);
    const gasEstimate = await multiCallDeploy.connect(executor).estimateGas.deployAndExecute(
      cfa,                    // counterfactual address
      artifacts.mainModule,   // main module address
      salt,                   // salt for deployment
      artifacts.factory,      // factory contract address
      transactions,           // transactions to execute after deployment
      walletNonce,            // wallet nonce
      signature,              // signature for the transactions
      txnOpts
    );
    console.log(`[${env.network}] ✅ Gas estimate successful: ${gasEstimate.toString()}`);
  } catch (gasError) {
    console.log(`[${env.network}] ❌ Gas estimation failed:`, gasError.message);
    console.log(`[${env.network}] 🚀 Static call succeeded but gas estimation failed - this often means gas limit issue`);
    console.log(`[${env.network}] 🚀 Proceeding with transaction using configured gas limit...`);
    
    // Don't throw the error, just proceed with configured gas limit
  }
  
  console.log(`[${env.network}] ============================================================`);

  console.log(`[${env.network}] Calling deployAndExecute...`);

  // STEP 3: Execute with the same nonce used for signature generation
  console.log(`[${env.network}] =================== EXECUTION DEBUG INFO ===================`);
  console.log(`[${env.network}] 🚀 About to call deployAndExecute with:`);
  console.log(`[${env.network}]   - CFA: ${cfa}`);
  console.log(`[${env.network}]   - Main Module: ${artifacts.mainModule}`);
  console.log(`[${env.network}]   - Salt: ${salt}`);
  console.log(`[${env.network}]   - Factory: ${artifacts.factory}`);
  console.log(`[${env.network}]   - Wallet Nonce: ${walletNonce} ⚠️ CRITICAL: Must match signature nonce`);
  console.log(`[${env.network}]   - Signature length: ${signature.length}`);
  console.log(`[${env.network}]   - Executor: ${await executor.getAddress()}`);
  console.log(`[${env.network}]   - Gas Limit: ${txnOpts.gasLimit}`);
  console.log(`[${env.network}] ============================================================`);
  
  // Verify nonce consistency before execution
  if (transactions.length > 0) {
    console.log(`[${env.network}] 🔍 NONCE CONSISTENCY CHECK:`);
    console.log(`[${env.network}]   - Signature was generated with nonce: ${walletNonce}`);
    console.log(`[${env.network}]   - deployAndExecute will be called with nonce: ${walletNonce}`);
    console.log(`[${env.network}]   - ✅ Nonces match - proceeding with execution`);
  }
  
  // This call exactly matches the Go service:
  // transactor.DeployAndExecute(txOpts, spec.Wallet.Address, mcs.mainModule.Address, 
  //                            salt32, mcs.factory.Address, transactions, &spec.UserNonce, spec.Signature)
  const tx = await multiCallDeploy.connect(executor).deployAndExecute(
    cfa,                    // counterfactual address (matches spec.Wallet.Address in Go)
    artifacts.mainModule,   // main module address (matches mcs.mainModule.Address in Go)
    salt,                   // salt for deployment (matches salt32 in Go)
    artifacts.factory,      // factory contract address (matches mcs.factory.Address in Go)
    transactions,           // transactions to execute after deployment (matches converted transactions in Go)
    walletNonce,            // wallet nonce (must match the nonce used in signature generation)
    signature,              // signature for the transactions (matches spec.Signature in Go)
    txnOpts
  );
  
  console.log(`[${env.network}] 📡 Deployment transaction hash: ${tx.hash}`);
  console.log(`[${env.network}] ⏳ Waiting for transaction confirmation...`);
  const receipt = await tx.wait();
  console.log(`[${env.network}] ✅ Transaction confirmed in block: ${receipt.blockNumber}`);
  console.log(`[${env.network}] ⛽ Gas used: ${receipt.gasUsed.toString()}`);
  
  // Check for events and transaction status
  console.log(`[${env.network}] 🔍 Checking transaction details...`);
  console.log(`[${env.network}]   - Transaction status: ${receipt.status}`);
  console.log(`[${env.network}]   - Events count: ${receipt.events?.length || 0}`);
  
  if (receipt.status === 0) {
    console.log(`[${env.network}] ❌ Transaction failed! Status: ${receipt.status}`);
    throw new Error('Wallet deployment transaction failed');
  }
  
  // Parse and display transaction events
  await parseTransactionEvents(receipt, env.network);
  
  // STEP 4: Enhanced post-execution verification
  console.log(`[${env.network}] ================ POST-EXECUTION VERIFICATION ================`);
  
  console.log(`[${env.network}] ⏳ Waiting for 3 seconds before continuing post-execution verification...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  try {
    // Connect to the deployed wallet proxy using MainModule interface
    const deployedWallet = await hardhat.getContractAt('MainModuleDynamicAuth', cfa);
    
    // Verify proxy is working correctly
    console.log(`[${env.network}] 🔍 Verifying deployed wallet proxy:`);
    try {
      const proxyInterface = await hardhat.getContractAt('IWalletProxy', cfa);
      const implementation = await proxyInterface.PROXY_getImplementation();
      console.log(`[${env.network}]   - Proxy implementation: ${implementation}`);
      console.log(`[${env.network}]   - Expected main module: ${artifacts.mainModule}`);
    } catch (proxyError) {
      console.log(`[${env.network}]   - Could not read proxy implementation: ${proxyError.message}`);
    }
    
    const finalNonce = (await deployedWallet.nonce()).toNumber();
    
    console.log(`[${env.network}] 🔍 Final wallet state:`);
    console.log(`[${env.network}]   - Wallet proxy address: ${cfa}`);
    console.log(`[${env.network}]   - Initial nonce: ${walletNonce}`);
    console.log(`[${env.network}]   - Final nonce: ${finalNonce}`);
    console.log(`[${env.network}]   - Expected nonce increment: ${transactions.length > 0 ? 1 : 0}`);
    console.log(`[${env.network}]   - Actual nonce increment: ${finalNonce - walletNonce}`);
    
    if (transactions.length > 0 && finalNonce === walletNonce + 1) {
      console.log(`[${env.network}] ✅ Nonce incremented correctly - transaction executed successfully`);
    } else if (transactions.length === 0 && finalNonce === walletNonce) {
      console.log(`[${env.network}] ✅ Nonce unchanged - deployment only (no transactions)`);
    } else {
      console.log(`[${env.network}] ⚠️  Unexpected nonce value - please investigate`);
    }
    
  } catch (error) {
    console.log(`[${env.network}] ⚠️  Could not verify final wallet state: ${error.message}`);
  }
  console.log(`[${env.network}] ==============================================================`);
  
  if (transactions.length > 0) {
    console.log(`[${env.network}] ✅ Wallet deployed and ${transactions.length} initial transaction(s) executed`);
  } else {
    console.log(`[${env.network}] ✅ Wallet deployed successfully (no initial transactions)`);
  }
}

/**
 * Parse and display transaction events in a readable format
 */
async function parseTransactionEvents(receipt: any, network: string): Promise<void> {
  console.log(`[${network}] =================== TRANSACTION EVENTS ===================`);
  
  const events = receipt.events || [];
  
  if (events.length > 0) {
    console.log(`[${network}] 📋 All events in transaction (${events.length} total):`);
    events.forEach((event: any, i: number) => {
      console.log(`[${network}]   Event ${i + 1}: ${event.event || 'Unknown'} from ${event.address}`);
      if (event.args) {
        // Log key arguments for common events
        const args = event.args;
        if (event.event === 'WalletCreated') {
          console.log(`[${network}]     - Wallet: ${args.wallet}`);
          console.log(`[${network}]     - Implementation: ${args.implementation}`);
        } else if (event.event === 'MultiCallDeployInvocationSuccess') {
          console.log(`[${network}]     - Success: MultiCallDeploy executed successfully`);
        } else if (event.event === 'Transfer') {
          console.log(`[${network}]     - From: ${args.from}`);
          console.log(`[${network}]     - To: ${args.to}`);
          console.log(`[${network}]     - Value: ${args.value?.toString()}`);
        }
      }
    });
  } else {
    console.log(`[${network}] ⚠️  No events found in transaction`);
  }
  
  console.log(`[${network}] ==========================================================`);
}

/**
 * Detect the implementation contract of a deployed wallet
 */
async function detectWalletImplementation(walletAddress: string, network: string): Promise<void> {
  console.log(`[${network}] =================== IMPLEMENTATION DETECTION ===================`);
  console.log(`[${network}] Detecting wallet implementation contract...`);
  
  try {
    // Check if there's deployed code at the provided address
    const code = await hardhat.provider.getCode(walletAddress);
    
    if (code && code !== '0x') {
      console.log(`[${network}] ✅ Wallet has deployed code`);
      
      let implementationAddress = 'not found';
      
      try {
        // First try PROXY_getImplementation() using IWalletProxy interface
        try {
          console.log(`[${network}] Trying PROXY_getImplementation() via IWalletProxy interface...`);
          const walletProxy = await hardhat.getContractAt('IWalletProxy', walletAddress);
          const proxyImplementation = await walletProxy.PROXY_getImplementation();
          
          if (proxyImplementation && proxyImplementation !== ethers.constants.AddressZero) {
            console.log(`[${network}] PROXY_getImplementation result: ${proxyImplementation}`);
            implementationAddress = proxyImplementation;
          }
        } catch (proxyError) {
          console.log(`[${network}] PROXY_getImplementation not available, trying getImplementation()...`);
          
          // If PROXY_getImplementation fails, try getImplementation()
          try {
            const nexusImplementation = await hardhat.provider.call({
              to: walletAddress,
              data: hardhat.utils.Interface.getSighash('getImplementation()')
            });
            
            if (nexusImplementation && nexusImplementation !== '0x') {
              const decodedAddress = ethers.utils.getAddress('0x' + nexusImplementation.slice(-40));
              console.log(`[${network}] getImplementation result: ${decodedAddress}`);
              implementationAddress = decodedAddress;
            }
          } catch (getImplError) {
            console.log(`[${network}] getImplementation also not available: ${getImplError.message}`);
          }
        }
        
        // Output the results
        console.log(`[${network}] 🔍 Implementation Detection Results:`);
        console.log(`[${network}]   - Implementation Address: ${implementationAddress}`);
        
        if (implementationAddress !== 'not found') {
          console.log(`[${network}] ✅ Successfully detected wallet implementation`);
        } else {
          console.log(`[${network}] ❌ Could not detect implementation - neither PROXY_getImplementation() nor getImplementation() methods are available`);
        }
        
      } catch (error) {
        console.log(`[${network}] ❌ Error during implementation detection: ${error.message}`);
      }
    } else {
      console.log(`[${network}] ❌ No code found at wallet address - wallet deployment may have failed`);
    }
    
  } catch (error) {
    console.log(`[${network}] ❌ Error checking wallet code: ${error.message}`);
  }
  
  console.log(`[${network}] ==============================================================`);
}

/**
 * Verify the wallet was deployed correctly
 */
async function verifyDeployment(walletAddress: string, network: string) {
  console.log(`[${network}] =================== FINAL VERIFICATION ===================`);
  console.log(`[${network}] Verifying wallet deployment...`);
  
  // Verify wallet deployment
  const code = await hardhat.provider.getCode(walletAddress);
  if (code === '0x') {
    throw new Error('Wallet deployment failed - no code at address');
  }
  
  console.log(`[${network}] ✅ Wallet deployment verified - wallet has code`);
  
  // Detect wallet implementation
  await detectWalletImplementation(walletAddress, network);
  
  // Try to connect to the wallet and verify it's working
  try {
    const wallet = await hardhat.getContractAt('MainModuleDynamicAuth', walletAddress);
    
    const nonce = await wallet.nonce();
    console.log(`[${network}] 🔍 Wallet nonce: ${nonce.toString()}`);
    
    console.log(`[${network}] ✅ Wallet interface verification successful`);
    
  } catch (error) {
    console.log(`[${network}] ⚠️  Could not verify wallet interface: ${error.message}`);
  }
  
  console.log(`[${network}] =========================================================`);
}

// Execute the script
  deployWallet()
    .then(() => {
      console.log('✅ Wallet deployment completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Wallet deployment failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
