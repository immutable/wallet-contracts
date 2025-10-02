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
} from '../../utils/helpers';

// Import deployment utilities
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';

/**
 * Unified configuration for wallet deployment
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
 * This script demonstrates wallet deployment using the initializeAccount function
 * with NexusBootstrap.initNexusNoRegistry for module installation via SignedMultiCallDeploy.
 * 
 * FLOW:
 * 1. Load deployed contract addresses from previous steps
 * 2. Deploy wallet via SignedMultiCallDeploy.deployAndExecuteWithSignature()
 * 3. First transaction: wallet calls itself to initializeAccount with bootstrap
 * 4. Bootstrap delegates to initNexusNoRegistry to install validator and executor modules
 * 5. Verify wallet deployment and module installations via bootstrap
 * 
 * KEY DIFFERENCES FROM ORIGINAL:
 * - Uses SignedMultiCallDeploy instead of MultiCallDeploy directly
 * - Requires CENTRAL_SIGNER_PRIVATE_KEY environment variable
 * - Generates provenance signature from central executor
 * - Calls deployAndExecuteWithSignature() with both wallet owner and executor signatures
 */
async function deployWalletWithSignedMultiCall(): Promise<void> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  
  console.log(`[${network}] Starting wallet deployment with SignedMultiCallDeploy...`);
  
  // Validate required environment variable
  const centralExecutorPrivateKey = process.env.CENTRAL_SIGNER_PRIVATE_KEY;
  if (!centralExecutorPrivateKey) {
    throw new Error('CENTRAL_SIGNER_PRIVATE_KEY environment variable is required');
  }
  
  // Setup wallet options
  const walletOptions: WalletOptions = await newWalletOptions(env);
  const deployer = walletOptions.getWallet();
  
  // Get network ID with default for hardhat local node
  const networkInfo = await hardhat.provider.getNetwork();
  const networkId = networkInfo.chainId || 31337; // Default to hardhat local chain ID
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
  
  console.log(`\n[${network}] Wallet configuration:`);
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
  
  // Deploy the wallet with bootstrap initialization using SignedMultiCallDeploy
  console.log(`[${network}] Using SignedMultiCallDeploy method with bootstrap initialization`);

  await deployWithSignedMultiCallDeployAndBootstrap(
    env,
    deploymentArtifacts,
    cfa,
    salt,
    walletConfig,
    networkId,
    centralExecutorPrivateKey
  );
  
  // Verify deployment and module installations
  await verifyBootstrapInitialization(cfa, deploymentArtifacts, network);
  
  console.log(`[${network}] Wallet deployment with SignedMultiCallDeploy completed successfully!`);
  console.log(`[${network}] Wallet address: ${cfa}`);
  console.log(`[${network}] Bootstrap address: ${deploymentArtifacts.nexusBootstrap}`);
  console.log(`[${network}] Validator address: ${deploymentArtifacts.mockValidator}`);
  console.log(`[${network}] Executor address: ${deploymentArtifacts.mockExecutor}`);
}

/**
 * Load deployment artifacts from previous steps
 */
function loadDeploymentArtifacts() {
  try {
    // Load from step artifacts
    const step1 = JSON.parse(fs.readFileSync('scripts/v2/step1.json', 'utf8'));
    const step3 = JSON.parse(fs.readFileSync('scripts/v2/step3.json', 'utf8'));
    const step6 = JSON.parse(fs.readFileSync('scripts/v2/step6.json', 'utf8'));
    const step7 = JSON.parse(fs.readFileSync('scripts/v2/step7.json', 'utf8'));
    
    return {
      factory: step1.factory,
      multiCallDeploy: step1.multiCallDeploy,
      signedMultiCallDeploy: step1.signedMultiCallDeploy, // NEW: SignedMultiCallDeploy address
      mainModule: step3.startupWalletImpl, // mainmodule == startupWalletImpl
      nexusBootstrap: step6.nexusBootstrap,
      mockValidator: step7.mockValidator,
      mockExecutor: step7.mockExecutor,
    };
  } catch (error) {
    console.error('Failed to load deployment artifacts. Make sure step1, step3, step6, and step7 have been completed.');
    throw error;
  }
}

/**
 * Deploy wallet using SignedMultiCallDeploy.deployAndExecuteWithSignature with bootstrap initialization
 */
async function deployWithSignedMultiCallDeployAndBootstrap(
  env: EnvironmentInfo,
  artifacts: any,
  cfa: string,
  salt: string,
  config: WalletDeploymentConfig,
  networkId: number,
  centralExecutorPrivateKey: string
) {
  console.log(`[${env.network}] =================== DEPLOYMENT START ===================`);
  console.log(`[${env.network}] 🚀 Starting wallet deployment with SignedMultiCallDeploy`);
  console.log(`[${env.network}] 📋 Initial parameters:`);
  console.log(`[${env.network}]   - Network: ${env.network}`);
  console.log(`[${env.network}]   - Network ID: ${networkId}`);
  console.log(`[${env.network}]   - Target CFA: ${cfa}`);
  console.log(`[${env.network}]   - Salt: ${salt}`);
  console.log(`[${env.network}]   - Bootstrap: ${artifacts.nexusBootstrap}`);
  console.log(`[${env.network}]   - Validator: ${artifacts.mockValidator}`);
  console.log(`[${env.network}]   - Executor: ${artifacts.mockExecutor}`);
  console.log(`[${env.network}]   - SignedMultiCallDeploy: ${artifacts.signedMultiCallDeploy}`);
  console.log(`[${env.network}] ========================================================`);
  
  // Get SignedMultiCallDeploy contract
  const SignedMultiCallDeploy = await hardhat.getContractFactory('SignedMultiCallDeploy');
  const signedMultiCallDeploy = SignedMultiCallDeploy.attach(artifacts.signedMultiCallDeploy);
  
  // Setup executor admin wallet
  const walletOptions: WalletOptions = await newWalletOptions(env);
  const executor = walletOptions.getWallet();
  const executorWalletAddress = await executor.getAddress();
  
  // Check if SignedMultiCallDeploy contract exists
  console.log(`[${env.network}] 🔐 Checking SignedMultiCallDeploy contract...`);
  console.log(`[${env.network}] SignedMultiCallDeploy address: ${artifacts.signedMultiCallDeploy}`);
  
  // Check if contract exists
  const signedMultiCallDeployCode = await hardhat.provider.getCode(artifacts.signedMultiCallDeploy);
  if (signedMultiCallDeployCode === '0x') {
    throw new Error(`SignedMultiCallDeploy contract not found at address ${artifacts.signedMultiCallDeploy}`);
  }
  console.log(`[${env.network}] ✅ SignedMultiCallDeploy contract exists`);
  
  // STEP 1: Check if wallet already exists and get current nonce
  console.log(`[${env.network}] Checking wallet existence at CFA: ${cfa}`);
  const walletCode = await hardhat.provider.getCode(cfa);
  const walletExists = walletCode !== '0x';
  
  let walletNonce = 0;
  if (walletExists) {
    console.log(`[${env.network}] ⚠️  Wallet already exists at ${cfa}`);
    
    try {
      const existingWallet = await hardhat.getContractAt('MainModuleDynamicAuthV2', cfa);
      walletNonce = (await existingWallet.nonce()).toNumber();
      console.log(`[${env.network}] ✅ Current wallet nonce: ${walletNonce}`);
    } catch (error) {
      console.log(`[${env.network}] ⚠️  Could not read wallet nonce, assuming 0. Error: ${error.message}`);
      walletNonce = 0;
    }
  } else {
    console.log(`[${env.network}] ✅ Wallet does not exist yet, will deploy with nonce 0`);
    walletNonce = 0;
  }

  // STEP 2: Create bootstrap initialization meta-transaction
  console.log(`[${env.network}] =================== BOOTSTRAP INITIALIZATION SETUP ===================`);
  
  // Get the wallet interface to encode the initializeAccount call
  const MainModuleDynamicAuthV2 = await hardhat.getContractFactory('MainModuleDynamicAuthV2');
  
  // Prepare the bootstrap call data for initNexusNoRegistry
  const NexusBootstrap = await hardhat.getContractFactory('NexusBootstrap');
  
  // Create bootstrap configurations
  // For MockValidator, we need to pass the authorized signer address in the initData
  const authorizedSigner = config.owners[0].address; // Use the wallet owner as authorized signer
  const validatorInitData = ethers.utils.solidityPack(['address'], [authorizedSigner]);
  
  const validators = [
    {
      module: artifacts.mockValidator,
      data: validatorInitData // Pass authorized signer address
    }
  ];
  
  const executors = [
    {
      module: artifacts.mockExecutor,
      data: "0x" // Empty initData
    }
  ];
  
  const hook = {
    module: ethers.constants.AddressZero, // No hook
    data: "0x"
  };
  
  const fallbacks = []; // Empty array
  const preValidationHooks = []; // Empty array
  
  console.log(`[${env.network}] 📋 Bootstrap configuration:`);
  console.log(`[${env.network}]   - Validators: [${artifacts.mockValidator}]`);
  console.log(`[${env.network}]   - Validator authorized signer: ${authorizedSigner}`);
  console.log(`[${env.network}]   - Validator initData: ${validatorInitData}`);
  console.log(`[${env.network}]   - Executors: [${artifacts.mockExecutor}]`);
  console.log(`[${env.network}]   - Hook: ${hook.module} (none)`);
  console.log(`[${env.network}]   - Fallbacks: [] (empty)`);
  console.log(`[${env.network}]   - PreValidationHooks: [] (empty)`);
  
  // Encode the bootstrap call
  const bootstrapCalldata = NexusBootstrap.interface.encodeFunctionData('initNexusNoRegistry', [
    validators,
    executors,
    hook,
    fallbacks,
    preValidationHooks
  ]);
  
  console.log(`[${env.network}] 📋 Bootstrap call data: ${bootstrapCalldata.slice(0, 66)}...`);
  
  // 🔧 FIX: When wallet calls itself (msg.sender == address(this)), 
  // initializeAccount bypasses InitializeLib.hash() and passes data directly to _initializeAccount
  // So we need to provide ONLY the bootstrap data (without chain info)
  const bootstrapInitData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes'],
    [artifacts.nexusBootstrap, bootstrapCalldata]
  );
  
  console.log(`[${env.network}] 📋 Bootstrap InitData structure (for self-call):`);
  console.log(`[${env.network}]   - Bootstrap Address: ${artifacts.nexusBootstrap}`);
  console.log(`[${env.network}]   - Bootstrap Call Data Length: ${bootstrapCalldata.length}`);
  console.log(`[${env.network}]   - Encoded InitData Length: ${bootstrapInitData.length}`);
  console.log(`[${env.network}]   - ℹ️  No chain info needed - self-call bypasses InitializeLib.hash()`);
  
  // Create the initializeAccount call data
  const initializeAccountCalldata = MainModuleDynamicAuthV2.interface.encodeFunctionData('initializeAccount', [
    bootstrapInitData // 🔧 Direct bootstrap data (no chain info for self-call)
  ]);
  
  console.log(`[${env.network}] 📋 InitializeAccount call data: ${initializeAccountCalldata.slice(0, 66)}...`);

  // Prepare the meta-transaction where wallet calls itself
  const transactions: any[] = [];
  
  // Transaction: Initialize account with bootstrap
  transactions.push({
    delegateCall: false,
    revertOnError: true,
    gasLimit: BigNumber.from(1000000), // Higher gas limit for bootstrap initialization
    target: cfa, // 🎯 WALLET CALLS ITSELF!
    value: 0, // No ETH transfer needed
    data: initializeAccountCalldata
  });
  
  console.log(`[${env.network}] 🎯 Meta-transaction created (BOOTSTRAP INITIALIZATION):`);
  console.log(`[${env.network}]   Transaction - Bootstrap Initialization:`);
  console.log(`[${env.network}]     - Target: ${cfa} (wallet calls itself)`);
  console.log(`[${env.network}]     - Function: initializeAccount(...)`);
  console.log(`[${env.network}]     - Gas Limit: ${transactions[0].gasLimit}`);
  console.log(`[${env.network}]     - Value: 0 ETH`);
  console.log(`[${env.network}] ====================================================================`);
  
  // STEP 3: Create wallet owner signature using the correct nonce
  console.log(`[${env.network}] ==================== WALLET OWNER SIGNATURE ====================`);
  console.log(`[${env.network}] Wallet exists: ${walletExists}`);
  console.log(`[${env.network}] Detected wallet nonce: ${walletNonce}`);
  console.log(`[${env.network}] Network ID: ${networkId}`);
  console.log(`[${env.network}] CFA: ${cfa}`);
  console.log(`[${env.network}] Transactions count: ${transactions.length}`);
  console.log(`[${env.network}] =========================================================`);
  
  let walletOwnersSignature = '0x';
  if (transactions.length > 0) {
    console.log(`[${env.network}] 🔐 Generating wallet owner signature with nonce: ${walletNonce}`);
    
    const data = encodeMetaTransactionsData(cfa, transactions, networkId, walletNonce);
    console.log(`[${env.network}] 📝 Encoded meta transaction data (first 66 chars): ${data.slice(0, 66)}...`);
    
    const ownerWallets = config.owners.map(owner => {
      return new Wallet(owner.privateKey);
    });
    
    console.log(`[${env.network}] 👥 Signing with ${config.owners.length} owner(s), threshold: ${config.threshold}`);
    
    walletOwnersSignature = await walletMultiSign(
      config.owners.map((owner, index) => ({
        weight: owner.weight,
        owner: ownerWallets[index]
      })),
      config.threshold,
      data,
      false
    );
    
    console.log(`[${env.network}] ✅ Generated wallet owner signature (length: ${walletOwnersSignature.length}): ${walletOwnersSignature.slice(0, 20)}...`);
  }
  
  // STEP 4: Create central executor signature for provenance
  console.log(`[${env.network}] ==================== CENTRAL EXECUTOR SIGNATURE ====================`);
  
  // Create central executor wallet
  const centralExecutorWallet = new Wallet(centralExecutorPrivateKey);
  const centralExecutorAddress = await centralExecutorWallet.getAddress();
  console.log(`[${env.network}] Central executor address: ${centralExecutorAddress}`);
  
  // Encode the call data exactly as SignedMultiCallDeploy does
  // This matches the abi.encodeWithSelector() call in the contract
  const multiCallDeployInterface = await hardhat.getContractFactory('MultiCallDeploy');
  const callData = multiCallDeployInterface.interface.encodeFunctionData('deployAndExecute', [
    cfa,                    // counterfactual address
    artifacts.mainModule,   // main module address
    salt,                   // salt for deployment
    artifacts.factory,      // factory contract address
    transactions,           // bootstrap initialization transaction
    walletNonce,            // wallet nonce
    walletOwnersSignature   // wallet owner signature
  ]);
  
  // Hash the call data exactly as the contract does
  const callDataHash = ethers.utils.keccak256(callData);
  
  // 2. The contract expects a signature over: keccak256(EIP-191 Prefix + callDataHash)
// ethers' signMessage function conveniently takes the RAW message (bytes) and applies
// the EIP-191 prefixing and hashing internally before signing.
// We pass the bytes of callDataHash (H1) as the message.
const executorSignature = await centralExecutorWallet.signMessage(
  ethers.utils.arrayify(callDataHash) // Pass H1 bytes as the 'message'
);

// This is correct because:
// signMessage(bytes) generates a signature over keccak256(EIP-191 Prefix + bytes)
// The contract generates the verification hash from: keccak256(EIP-191 Prefix + keccak256(callData))
// Both are signing/verifying the same final hash.
  
  console.log(`[${env.network}] 📋 Central executor signature details:`);
  console.log(`[${env.network}]   - Call data length: ${callData.length}`);
  console.log(`[${env.network}]   - Call data hash: ${callDataHash}`);
  console.log(`[${env.network}]   - Executor signature: ${executorSignature}`);
  console.log(`[${env.network}] ================================================================`);
  
  console.log(`[${env.network}] Calling SignedMultiCallDeploy.deployAndExecuteWithSignature...`);

  // Get executor wallet's current nonce
  let currentNonce = await hardhat.provider.getTransactionCount(executorWalletAddress);
  console.log(`[${env.network}] Executor wallet current nonce: ${currentNonce}`);

  // Create transaction options with very high gas limit
  const txnOpts = {
    gasLimit: BigNumber.from("10000000"), // Very high gas limit for bootstrap
    maxFeePerGas: process.env.MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
    nonce: currentNonce,
    // Note: Don't include 'from' when using a contract with signer - it's determined by the signer
  };

  // STEP 5: Execute with bootstrap initialization via SignedMultiCallDeploy
  console.log(`[${env.network}] =================== EXECUTION DEBUG INFO ===================`);
  console.log(`[${env.network}] 🚀 About to call deployAndExecuteWithSignature:`);
  console.log(`[${env.network}]   - CFA: ${cfa}`);
  console.log(`[${env.network}]   - Main Module: ${artifacts.mainModule}`);
  console.log(`[${env.network}]   - Salt: ${salt}`);
  console.log(`[${env.network}]   - Factory: ${artifacts.factory}`);
  console.log(`[${env.network}]   - Wallet Nonce: ${walletNonce}`);
  console.log(`[${env.network}]   - Bootstrap Address: ${artifacts.nexusBootstrap}`);
  console.log(`[${env.network}]   - Gas Limit: ${txnOpts.gasLimit}`);
  console.log(`[${env.network}]   - Central Executor: ${centralExecutorAddress}`);
  console.log(`[${env.network}] ============================================================`);

  // Add detailed pre-execution checks
  console.log(`[${env.network}] 🔍 Pre-execution validation:`);
  console.log(`[${env.network}]   - Wallet owner signature length: ${walletOwnersSignature.length}`);
  console.log(`[${env.network}]   - Wallet owner signature first 20 bytes: ${walletOwnersSignature.slice(0, 42)}`);
  console.log(`[${env.network}]   - Executor signature length: ${executorSignature.length}`);
  console.log(`[${env.network}]   - Executor signature first 20 bytes: ${executorSignature.slice(0, 42)}`);
  console.log(`[${env.network}]   - Transaction data length: ${transactions[0].data.length}`);
  
  // Check all contract deployments
  const factoryCode = await hardhat.provider.getCode(artifacts.factory);
  const mainModuleCode = await hardhat.provider.getCode(artifacts.mainModule);
  const bootstrapCode = await hardhat.provider.getCode(artifacts.nexusBootstrap);
  const validatorCode = await hardhat.provider.getCode(artifacts.mockValidator);
  const executorCode = await hardhat.provider.getCode(artifacts.mockExecutor);
  
  console.log(`[${env.network}]   - Factory exists: ${factoryCode !== '0x'}`);
  console.log(`[${env.network}]   - MainModule exists: ${mainModuleCode !== '0x'}`);
  console.log(`[${env.network}]   - Bootstrap exists: ${bootstrapCode !== '0x'}`);
  console.log(`[${env.network}]   - MockValidator exists: ${validatorCode !== '0x'}`);
  console.log(`[${env.network}]   - MockExecutor exists: ${executorCode !== '0x'}`);
  
  // Try to call the function statically first to get better error messages
  try {
    console.log(`[${env.network}] 🔍 Testing deployAndExecuteWithSignature with staticCall...`);
    await signedMultiCallDeploy.connect(executor).callStatic.deployAndExecuteWithSignature(
      cfa,                    // counterfactual address
      artifacts.mainModule,   // main module address
      salt,                   // salt for deployment
      artifacts.factory,      // factory contract address
      transactions,           // bootstrap initialization transaction
      walletNonce,            // wallet nonce
      walletOwnersSignature,  // wallet owner signature
      executorSignature,      // central executor signature
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
        const decoded = hardhat.utils.defaultAbiCoder.decode(['string'], staticError.data);
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
    console.log(`[${env.network}] 🔍 Estimating gas for deployAndExecuteWithSignature...`);
    const gasEstimate = await signedMultiCallDeploy.connect(executor).estimateGas.deployAndExecuteWithSignature(
      cfa,                    // counterfactual address
      artifacts.mainModule,   // main module address
      salt,                   // salt for deployment
      artifacts.factory,      // factory contract address
      transactions,           // bootstrap initialization transaction
      walletNonce,            // wallet nonce
      walletOwnersSignature,  // wallet owner signature
      executorSignature,      // central executor signature
      txnOpts
    );
    console.log(`[${env.network}] ✅ Gas estimate successful: ${gasEstimate.toString()}`);
  } catch (gasError) {
    console.log(`[${env.network}] ❌ Gas estimation failed:`, gasError.message);
    console.log(`[${env.network}] 🚀 Static call succeeded but gas estimation failed - this often means gas limit issue`);
    console.log(`[${env.network}] 🚀 Proceeding with transaction using high gas limit...`);
    
    // Don't throw the error, just proceed with high gas limit
  }

  const tx = await signedMultiCallDeploy.connect(executor).deployAndExecuteWithSignature(
    cfa,                    // counterfactual address
    artifacts.mainModule,   // main module address
    salt,                   // salt for deployment
    artifacts.factory,      // factory contract address
    transactions,           // bootstrap initialization transaction
    walletNonce,            // wallet nonce
    walletOwnersSignature,  // wallet owner signature
    executorSignature,      // central executor signature
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
    throw new Error('Bootstrap initialization transaction failed');
  }
  
  const events = receipt.events || [];
  
  // Log all events for debugging
  if (events.length > 0) {
    console.log(`[${env.network}] 📋 All events in transaction:`);
    events.forEach((event, i) => {
      console.log(`[${env.network}]   Event ${i}: ${event.event || 'Unknown'} from ${event.address}`);
    });
  }
  
  // Look for ModuleInstalled events from bootstrap
  const moduleInstalledEvents = events.filter(e => e.event === 'ModuleInstalled');
  if (moduleInstalledEvents.length > 0) {
    console.log(`[${env.network}] 🎉 ModuleInstalled events found: ${moduleInstalledEvents.length}`);
    moduleInstalledEvents.forEach((event, i) => {
      console.log(`[${env.network}]   Event ${i + 1}:`);
      console.log(`[${env.network}]     - moduleTypeId: ${event.args?.moduleTypeId}`);
      console.log(`[${env.network}]     - module: ${event.args?.module}`);
    });
  } else {
    console.log(`[${env.network}] ⚠️  ModuleInstalled events not found - bootstrap may have failed`);
  }
  
  // Look for MultiCallDeployInvocationSuccess event
  const invocationSuccessEvents = events.filter(e => e.event === 'MultiCallDeployInvocationSuccess');
  if (invocationSuccessEvents.length > 0) {
    console.log(`[${env.network}] 🎉 MultiCallDeployInvocationSuccess event found - SignedMultiCallDeploy executed successfully`);
  } else {
    console.log(`[${env.network}] ⚠️  MultiCallDeployInvocationSuccess event not found`);
  }
  
  // STEP 6: Post-execution verification
  console.log(`[${env.network}] ================ POST-EXECUTION VERIFICATION ================`);
  try {
    const deployedWallet = await hardhat.getContractAt('MainModuleDynamicAuthV2', cfa);
    const finalNonce = (await deployedWallet.nonce()).toNumber();
    
    console.log(`[${env.network}] 🔍 Final wallet state:`);
    console.log(`[${env.network}]   - Wallet proxy address: ${cfa}`);
    console.log(`[${env.network}]   - Initial nonce: ${walletNonce}`);
    console.log(`[${env.network}]   - Final nonce: ${finalNonce}`);
    console.log(`[${env.network}]   - Expected nonce increment: ${transactions.length}`);
    console.log(`[${env.network}]   - Actual nonce increment: ${finalNonce - walletNonce}`);
    
    if (finalNonce === walletNonce + transactions.length) {
      console.log(`[${env.network}] ✅ Nonce incremented correctly - bootstrap initialization executed successfully`);
    } else {
      console.log(`[${env.network}] ⚠️  Unexpected nonce value - please investigate`);
    }
    
    // Check if wallet is initialized
    const isInitialized = await deployedWallet.isInitialized();
    console.log(`[${env.network}]   - Wallet initialized: ${isInitialized}`);
    
    if (!isInitialized) {
      console.log(`[${env.network}] ⚠️  Wallet is not initialized - bootstrap may have failed`);
    }
    
  } catch (error) {
    console.log(`[${env.network}] ⚠️  Could not verify final wallet state: ${error.message}`);
  }
  console.log(`[${env.network}] ==============================================================`);
  
  console.log(`[${env.network}] ✅ Wallet deployed and bootstrap initialization executed via SignedMultiCallDeploy!`);
  console.log(`[${env.network}] 🎯 Module installations via bootstrap should now be complete`);
}

/**
 * Verify the wallet was deployed correctly and modules were installed via bootstrap
 */
async function verifyBootstrapInitialization(walletAddress: string, artifacts: any, network: string) {
  console.log(`[${network}] =================== FINAL VERIFICATION ===================`);
  console.log(`[${network}] Verifying wallet deployment and bootstrap initialization...`);
  
  // Verify wallet deployment
  const code = await hardhat.provider.getCode(walletAddress);
  if (code === '0x') {
    throw new Error('Wallet deployment failed - no code at address');
  }
  
  console.log(`[${network}] ✅ Wallet deployment verified - wallet has code`);
  
  // Try to connect to the wallet and verify module installations
  try {
    const wallet = await hardhat.getContractAt('MainModuleDynamicAuthV2', walletAddress);
    
    // Check if wallet is initialized
    const isInitialized = await wallet.isInitialized();
    console.log(`[${network}] 🔍 Wallet initialization status: ${isInitialized}`);
    
    if (!isInitialized) {
      console.log(`[${network}] ❌ Wallet is not initialized - bootstrap initialization failed`);
      return;
    }
    
    // Check if validator module is installed
    const isValidatorInstalled = await wallet.isModuleInstalled(
      1, // MODULE_TYPE_VALIDATOR
      artifacts.mockValidator,
      "0x" // No additional context needed
    );
    
    // Check if executor module is installed
    const isExecutorInstalled = await wallet.isModuleInstalled(
      2, // MODULE_TYPE_EXECUTOR
      artifacts.mockExecutor,
      "0x" // No additional context needed
    );
    
    console.log(`[${network}] 🔍 Module installation status (via bootstrap):`);
    console.log(`[${network}]   - Validator address: ${artifacts.mockValidator}`);
    console.log(`[${network}]   - Validator installed: ${isValidatorInstalled}`);
    console.log(`[${network}]   - Executor address: ${artifacts.mockExecutor}`);
    console.log(`[${network}]   - Executor installed: ${isExecutorInstalled}`);
    
    if (isValidatorInstalled && isExecutorInstalled) {
      console.log(`[${network}] 🎉 Both validator and executor modules successfully installed via bootstrap!`);
      
      // Check if modules are initialized
      try {
        const validator = await hardhat.getContractAt('MockValidator', artifacts.mockValidator);
        const isValidatorInitialized = await validator.isInitialized(walletAddress);
        console.log(`[${network}]   - Validator initialized: ${isValidatorInitialized}`);
        
        const executor = await hardhat.getContractAt('MockExecutor', artifacts.mockExecutor);
        const isExecutorInitialized = await executor.isInitialized(walletAddress);
        console.log(`[${network}]   - Executor initialized: ${isExecutorInitialized}`);
        
        if (isValidatorInitialized && isExecutorInitialized) {
          console.log(`[${network}] ✅ Both modules are properly initialized via bootstrap`);
        } else {
          console.log(`[${network}] ⚠️  One or more modules are installed but not initialized`);
        }
      } catch (error) {
        console.log(`[${network}]   - Could not check module initialization: ${error.message}`);
      }
    } else {
      console.log(`[${network}] ❌ One or more module installations failed via bootstrap`);
      if (!isValidatorInstalled) {
        console.log(`[${network}]   - Validator module installation failed`);
      }
      if (!isExecutorInstalled) {
        console.log(`[${network}]   - Executor module installation failed`);
      }
    }
    
    // Check if wallet supports the module types
    const supportsValidator = await wallet.supportsModule(1);
    const supportsExecutor = await wallet.supportsModule(2);
    console.log(`[${network}]   - Wallet supports validators: ${supportsValidator}`);
    console.log(`[${network}]   - Wallet supports executors: ${supportsExecutor}`);
    
  } catch (error) {
    console.log(`[${network}] ⚠️  Could not verify bootstrap initialization: ${error.message}`);
  }
  
  console.log(`[${network}] =========================================================`);
}

// Execute the script
deployWalletWithSignedMultiCall()
  .then(() => {
    console.log('✅ Wallet deployment with SignedMultiCallDeploy completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Wallet deployment with SignedMultiCallDeploy failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

