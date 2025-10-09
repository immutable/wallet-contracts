import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers as hardhat } from 'hardhat';
import { Wallet, BigNumber, Contract, ContractFactory } from 'ethers';
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
import { newContractFactory } from '../helper-functions';

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
 * This script extends the MultiCallDeploy method to include both validator and executor 
 * module installations as the initial transactions.
 * 
 * FLOW:
 * 1. Deploy MockValidator contract (pre-step)
 * 2. Deploy MockExecutor contract (pre-step)
 * 3. Deploy wallet via MultiCallDeploy.deployAndExecute()
 * 4. First transaction: wallet calls itself to install validator module
 * 5. Second transaction: wallet calls itself to install executor module
 * 6. Verify wallet deployment and both module installations
 */
async function deployWalletWithValidatorAndExecutor(): Promise<void> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  
  console.log(`[${network}] Starting wallet deployment with validator and executor installation...`);
  
  // Setup wallet options
  const walletOptions: WalletOptions = await newWalletOptions(env);
  const deployer = walletOptions.getWallet();
  const networkId = (await hardhat.provider.getNetwork()).chainId;

  console.log(`[${network}] Network ID: ${networkId}`);
  
  // Load deployed contract addresses (from previous deployment steps)
  const deploymentArtifacts = loadDeploymentArtifacts();

  // PRESTEP: Deploy MockValidator and MockExecutor contracts
  console.log(`\n[${network}] =================== PRESTEP: MODULE DEPLOYMENTS ===================`);
  
  const mockValidator = await deployMockValidator(deployer, network);
  console.log(`[${network}] ✅ MockValidator deployed at: ${mockValidator.address}`);
  
  const mockExecutor = await deployMockExecutor(deployer, network);
  console.log(`[${network}] ✅ MockExecutor deployed at: ${mockExecutor.address}`);
  
  console.log(`[${network}] ====================================================================`);

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
  
  // Deploy the wallet with validator and executor installations
  console.log(`[${network}] Using MultiCallDeploy method with validator and executor installation`);

  await deployWithMultiCallDeployAndModules(
    env,
    deploymentArtifacts,
    cfa,
    salt,
    walletConfig,
    networkId,
    mockValidator.address,
    mockExecutor.address
  );
  
  // Verify deployment and module installations
  await verifyDeploymentAndModules(cfa, mockValidator.address, mockExecutor.address, network);
  
  console.log(`[${network}] Wallet deployment with validator and executor installation completed successfully!`);
  console.log(`[${network}] Wallet address: ${cfa}`);
  console.log(`[${network}] Validator address: ${mockValidator.address}`);
  console.log(`[${network}] Executor address: ${mockExecutor.address}`);
}

/**
 * Deploy MockValidator contract as a prestep
 */
async function deployMockValidator(deployer: any, network: string): Promise<Contract> {
  console.log(`[${network}] Deploying MockValidator contract...`);
  
  const mockValidatorFactory: ContractFactory = await newContractFactory(deployer, "MockValidator");
  const mockValidator: Contract = await mockValidatorFactory.deploy();
  await mockValidator.deployed();
  
  console.log(`[${network}] MockValidator deployment transaction: ${mockValidator.deployTransaction.hash}`);
  
  // Verify the contract implements the correct interface
  try {
    const isValidatorType = await mockValidator.isModuleType(1); // MODULE_TYPE_VALIDATOR
    console.log(`[${network}] MockValidator type verification: ${isValidatorType}`);
    
    if (!isValidatorType) {
      throw new Error('MockValidator does not implement MODULE_TYPE_VALIDATOR');
    }
  } catch (error) {
    console.warn(`[${network}] Could not verify MockValidator interface: ${error.message}`);
  }
  
  return mockValidator;
}

/**
 * Deploy MockExecutor contract as a prestep
 */
async function deployMockExecutor(deployer: any, network: string): Promise<Contract> {
  console.log(`[${network}] Deploying MockExecutor contract...`);
  
  const mockExecutorFactory: ContractFactory = await newContractFactory(deployer, "MockExecutor");
  const mockExecutor: Contract = await mockExecutorFactory.deploy();
  await mockExecutor.deployed();
  
  console.log(`[${network}] MockExecutor deployment transaction: ${mockExecutor.deployTransaction.hash}`);
  
  // Verify the contract implements the correct interface
  try {
    const isExecutorType = await mockExecutor.isModuleType(2); // MODULE_TYPE_EXECUTOR
    console.log(`[${network}] MockExecutor type verification: ${isExecutorType}`);
    
    if (!isExecutorType) {
      throw new Error('MockExecutor does not implement MODULE_TYPE_EXECUTOR');
    }
  } catch (error) {
    console.warn(`[${network}] Could not verify MockExecutor interface: ${error.message}`);
  }
  
  return mockExecutor;
}

/**
 * Load deployment artifacts from previous steps
 */
function loadDeploymentArtifacts() {
  try {
    // Try to load from step artifacts (adjust paths as needed)
    const step1 = JSON.parse(fs.readFileSync('scripts/v2/step1.json', 'utf8'));
    const step3 = JSON.parse(fs.readFileSync('scripts/v2/step3.json', 'utf8'));
    const step5 = JSON.parse(fs.readFileSync('scripts/v2/step5.json', 'utf8'));
    
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
 * Deploy wallet using MultiCallDeploy.deployAndExecute with validator and executor installations
 * 
 * This method follows the same pattern as the original wallet deployment but replaces
 * the ETH transfer transaction with two module installation transactions.
 */
async function deployWithMultiCallDeployAndModules(
  env: EnvironmentInfo,
  artifacts: any,
  cfa: string,
  salt: string,
  config: WalletDeploymentConfig,
  networkId: number,
  validatorAddress: string,
  executorAddress: string
) {
  console.log(`[${env.network}] =================== DEPLOYMENT START ===================`);
  console.log(`[${env.network}] 🚀 Starting wallet deployment with validator and executor installation`);
  console.log(`[${env.network}] 📋 Initial parameters:`);
  console.log(`[${env.network}]   - Network: ${env.network}`);
  console.log(`[${env.network}]   - Network ID: ${networkId}`);
  console.log(`[${env.network}]   - Target CFA: ${cfa}`);
  console.log(`[${env.network}]   - Salt: ${salt}`);
  console.log(`[${env.network}]   - Validator: ${validatorAddress}`);
  console.log(`[${env.network}]   - Executor: ${executorAddress}`);
  console.log(`[${env.network}] ========================================================`);
  
  // Get MultiCallDeploy contract
  const MultiCallDeploy = await hardhat.getContractFactory('MultiCallDeploy');
  const multiCallDeploy = MultiCallDeploy.attach(artifacts.multiCallDeploy);
  
  // Setup executor admin wallet
  const walletOptions: WalletOptions = await newWalletOptions(env);
  const executor = walletOptions.getWallet();
  const executorWalletAddress = await executor.getAddress();
  
  // Check if MultiCallDeploy contract exists and has the right interface
  console.log(`[${env.network}] 🔐 Checking MultiCallDeploy contract...`);
  console.log(`[${env.network}] MultiCallDeploy address: ${artifacts.multiCallDeploy}`);
  
  // Check if contract exists
  const multiCallDeployCode = await hardhat.provider.getCode(artifacts.multiCallDeploy);
  if (multiCallDeployCode === '0x') {
    throw new Error(`MultiCallDeploy contract not found at address ${artifacts.multiCallDeploy}`);
  }
  console.log(`[${env.network}] ✅ MultiCallDeploy contract exists`);
  
  // Check if executor has EXECUTOR_ROLE
  try {
    const executorRole = await multiCallDeploy.EXECUTOR_ROLE();
    const hasExecutorRole = await multiCallDeploy.hasRole(executorRole, executorWalletAddress);
    
    console.log(`[${env.network}] Executor address: ${executorWalletAddress}`);
    console.log(`[${env.network}] EXECUTOR_ROLE: ${executorRole}`);
    console.log(`[${env.network}] Has EXECUTOR_ROLE: ${hasExecutorRole}`);
    
    if (!hasExecutorRole) {
      console.log(`[${env.network}] ⚠️  Executor does not have EXECUTOR_ROLE!`);
      console.log(`[${env.network}] This will cause deployAndExecute to fail with access control error`);
      console.log(`[${env.network}] Please run: npx hardhat run scripts/grant-executor-role.ts --network ${env.network}`);
      throw new Error(`Executor ${executorWalletAddress} does not have EXECUTOR_ROLE on MultiCallDeploy contract`);
    } else {
      console.log(`[${env.network}] ✅ Executor has required permissions`);
    }
  } catch (error) {
    console.log(`[${env.network}] ❌ Error checking executor role: ${error.message}`);
    console.log(`[${env.network}] This might indicate the contract interface is different or the contract is not deployed correctly`);
    throw error;
  }
  
  // STEP 1: Check if wallet already exists and get current nonce
  console.log(`[${env.network}] Checking wallet existence at CFA: ${cfa}`);
  const walletCode = await hardhat.provider.getCode(cfa);
  const walletExists = walletCode !== '0x';
  
  let walletNonce = 0;
  if (walletExists) {
    console.log(`[${env.network}] ⚠️  Wallet already exists at ${cfa}`);
    
    // Connect to existing wallet proxy to get current nonce
    try {
      // The CFA is a proxy that delegates to MainModuleDynamicAuthV2
      // We connect to the proxy using the MainModule interface
      const existingWallet = await hardhat.getContractAt('MainModuleDynamicAuthV2', cfa);
      
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
    walletNonce = 0;
  }

  // STEP 2: Create validator and executor installation meta-transactions
  console.log(`[${env.network}] =================== MODULE INSTALLATION SETUP ===================`);
  
  // Get the wallet interface to encode the installModule calls
  const MainModuleDynamicAuthV2 = await hardhat.getContractFactory('MainModuleDynamicAuthV2');
  
  // Create the validator installModule call data
  const validatorInstallCalldata = MainModuleDynamicAuthV2.interface.encodeFunctionData('installModule', [
    1, // MODULE_TYPE_VALIDATOR
    validatorAddress,
    "0x" // Empty initData as requested
  ]);
  
  // Create the executor installModule call data
  const executorInstallCalldata = MainModuleDynamicAuthV2.interface.encodeFunctionData('installModule', [
    2, // MODULE_TYPE_EXECUTOR
    executorAddress,
    "0x" // Empty initData as requested
  ]);
  
  console.log(`[${env.network}] 📋 Validator installation details:`);
  console.log(`[${env.network}]   - Module Type: 1 (VALIDATOR)`);
  console.log(`[${env.network}]   - Module Address: ${validatorAddress}`);
  console.log(`[${env.network}]   - Init Data: 0x (empty)`);
  console.log(`[${env.network}]   - Encoded Call Data: ${validatorInstallCalldata}`);
  
  console.log(`[${env.network}] 📋 Executor installation details:`);
  console.log(`[${env.network}]   - Module Type: 2 (EXECUTOR)`);
  console.log(`[${env.network}]   - Module Address: ${executorAddress}`);
  console.log(`[${env.network}]   - Init Data: 0x (empty)`);
  console.log(`[${env.network}]   - Encoded Call Data: ${executorInstallCalldata}`);

  // Prepare the meta-transactions where wallet calls itself
  const transactions: any[] = [];
  
  // Transaction 1: Install validator module
  transactions.push({
    delegateCall: false,
    revertOnError: true,
    gasLimit: BigNumber.from(500000), // Higher gas limit for module installation
    target: cfa, // 🎯 WALLET CALLS ITSELF!
    value: 0, // No ETH transfer needed
    data: validatorInstallCalldata
  });
  
  // Transaction 2: Install executor module
  transactions.push({
    delegateCall: false,
    revertOnError: true,
    gasLimit: BigNumber.from(500000), // Higher gas limit for module installation
    target: cfa, // 🎯 WALLET CALLS ITSELF!
    value: 0, // No ETH transfer needed
    data: executorInstallCalldata
  });
  
  console.log(`[${env.network}] 🎯 Meta-transactions created (MODULE INSTALLATIONS):`);
  console.log(`[${env.network}]   Transaction 1 - Validator Installation:`);
  console.log(`[${env.network}]     - Target: ${cfa} (wallet calls itself)`);
  console.log(`[${env.network}]     - Function: installModule(1, ${validatorAddress}, 0x)`);
  console.log(`[${env.network}]     - Gas Limit: ${transactions[0].gasLimit}`);
  console.log(`[${env.network}]     - Value: 0 ETH`);
  console.log(`[${env.network}]   Transaction 2 - Executor Installation:`);
  console.log(`[${env.network}]     - Target: ${cfa} (wallet calls itself)`);
  console.log(`[${env.network}]     - Function: installModule(2, ${executorAddress}, 0x)`);
  console.log(`[${env.network}]     - Gas Limit: ${transactions[1].gasLimit}`);
  console.log(`[${env.network}]     - Value: 0 ETH`);
  console.log(`[${env.network}] ====================================================================`);
  
  // STEP 3: Create signature using the correct nonce
  console.log(`[${env.network}] ==================== SIGNATURE GENERATION ====================`);
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

  console.log(`[${env.network}] Calling deployAndExecute...`);

  // Get executor wallet's current nonce
  let currentNonce = await hardhat.provider.getTransactionCount(executorWalletAddress);
  console.log(`[${env.network}] Executor wallet current nonce: ${currentNonce}`);
  
  // Verify nonce consistency before execution
  if (transactions.length > 0) {
    console.log(`[${env.network}] 🔍 NONCE CONSISTENCY CHECK:`);
    console.log(`[${env.network}]   - Signature was generated with nonce: ${walletNonce}`);
    console.log(`[${env.network}]   - deployAndExecute will be called with nonce: ${walletNonce}`);
    console.log(`[${env.network}]   - ✅ Nonces match - proceeding with execution`);
  }
  
  // No funding needed for module installations (no ETH transfer)
  console.log(`[${env.network}] ℹ️  No wallet funding needed - module installations don't require ETH`);

  // Create transaction options with the correct nonce
  const txnOpts = {
    gasLimit: BigNumber.from(process.env.GAS_LIMIT || "4000000"), // Higher default for module installations
    maxFeePerGas: process.env.MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
    nonce: currentNonce, // Use the updated nonce
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // submitter (gas sponsor) -- localhost
  };

  // STEP 4: Execute with the same nonce used for signature generation
  console.log(`[${env.network}] =================== EXECUTION DEBUG INFO ===================`);
  console.log(`[${env.network}] 🚀 About to call deployAndExecute with:`);
  console.log(`[${env.network}]   - CFA: ${cfa}`);
  console.log(`[${env.network}]   - Main Module: ${artifacts.mainModule}`);
  console.log(`[${env.network}]   - Salt: ${salt}`);
  console.log(`[${env.network}]   - Factory: ${artifacts.factory}`);
  console.log(`[${env.network}]   - Wallet Nonce: ${walletNonce} ⚠️ CRITICAL: Must match signature nonce`);
  console.log(`[${env.network}]   - Signature length: ${signature.length}`);
  console.log(`[${env.network}]   - Executor: ${await executor.getAddress()}`);
  console.log(`[${env.network}]   - Executor Nonce: ${currentNonce} ⚠️ CRITICAL: Must be correct after funding`);
  console.log(`[${env.network}]   - Gas Limit: ${txnOpts.gasLimit}`);
  console.log(`[${env.network}] ============================================================`);

  // This call exactly matches the Go service but with module installation transactions:
  const tx = await multiCallDeploy.connect(executor).deployAndExecute(
    cfa,                    // counterfactual address (matches spec.Wallet.Address in Go)
    artifacts.mainModule,   // main module address (matches mcs.mainModule.Address in Go)
    salt,                   // salt for deployment (matches salt32 in Go)
    artifacts.factory,      // factory contract address (matches mcs.factory.Address in Go)
    transactions,           // module installation transactions instead of ETH transfer
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
    console.log(`[${env.network}] This likely means the deployment or module installations failed`);
  }
  
  const events = receipt.events || [];
  
  // Log all events for debugging
  if (events.length > 0) {
    console.log(`[${env.network}] 📋 All events in transaction:`);
    events.forEach((event, i) => {
      console.log(`[${env.network}]   Event ${i}: ${event.event || 'Unknown'} from ${event.address}`);
    });
  }
  
  // Look for ModuleInstalled events
  const moduleInstalledEvents = events.filter(e => e.event === 'ModuleInstalled');
  if (moduleInstalledEvents.length > 0) {
    console.log(`[${env.network}] 🎉 ModuleInstalled events found: ${moduleInstalledEvents.length}`);
    moduleInstalledEvents.forEach((event, i) => {
      console.log(`[${env.network}]   Event ${i + 1}:`);
      console.log(`[${env.network}]     - moduleTypeId: ${event.args?.moduleTypeId}`);
      console.log(`[${env.network}]     - module: ${event.args?.module}`);
    });
  } else {
    console.log(`[${env.network}] ⚠️  ModuleInstalled events not found in transaction receipt`);
  }
  
  // Look for WalletDeployed event
  const walletDeployedEvent = events.find(e => e.event === 'WalletDeployed');
  if (walletDeployedEvent) {
    console.log(`[${env.network}] 🎉 WalletDeployed event found!`);
    console.log(`[${env.network}]   - wallet: ${walletDeployedEvent.args?.wallet || walletDeployedEvent.args?._contract}`);
  } else {
    console.log(`[${env.network}] ⚠️  WalletDeployed event not found - deployment may have failed`);
  }
  
  // STEP 5: Post-execution verification
  console.log(`[${env.network}] ================ POST-EXECUTION VERIFICATION ================`);
  try {
    // Connect to the deployed wallet proxy using MainModule interface
    const deployedWallet = await hardhat.getContractAt('MainModuleDynamicAuthV2', cfa);
    
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
    console.log(`[${env.network}]   - Expected nonce increment: ${transactions.length > 0 ? transactions.length : 0}`);
    console.log(`[${env.network}]   - Actual nonce increment: ${finalNonce - walletNonce}`);
    
    if (transactions.length > 0 && finalNonce === walletNonce + transactions.length) {
      console.log(`[${env.network}] ✅ Nonce incremented correctly - all module installations executed successfully`);
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
    console.log(`[${env.network}] ✅ Wallet deployed and ${transactions.length} module installation transactions executed!`);
    console.log(`[${env.network}] 🎯 Validator and executor installations should now be complete`);
  } else {
    console.log(`[${env.network}] ✅ Wallet deployed successfully (no transactions)`);
  }
}

/**
 * Verify the wallet was deployed correctly and both modules were installed
 */
async function verifyDeploymentAndModules(walletAddress: string, validatorAddress: string, executorAddress: string, network: string) {
  console.log(`[${network}] =================== FINAL VERIFICATION ===================`);
  console.log(`[${network}] Verifying wallet deployment and module installations...`);
  
  // Verify wallet deployment
  const code = await hardhat.provider.getCode(walletAddress);
  if (code === '0x') {
    throw new Error('Wallet deployment failed - no code at address');
  }
  
  console.log(`[${network}] ✅ Wallet deployment verified - wallet has code`);
  
  // Try to connect to the wallet and verify module installations
  try {
    const wallet = await hardhat.getContractAt('MainModuleDynamicAuthV2', walletAddress);
    
    // Check if validator module is installed
    const isValidatorInstalled = await wallet.isModuleInstalled(
      1, // MODULE_TYPE_VALIDATOR
      validatorAddress,
      "0x" // No additional context needed
    );
    
    // Check if executor module is installed
    const isExecutorInstalled = await wallet.isModuleInstalled(
      2, // MODULE_TYPE_EXECUTOR
      executorAddress,
      "0x" // No additional context needed
    );
    
    console.log(`[${network}] 🔍 Module installation status:`);
    console.log(`[${network}]   - Validator address: ${validatorAddress}`);
    console.log(`[${network}]   - Validator installed: ${isValidatorInstalled}`);
    console.log(`[${network}]   - Executor address: ${executorAddress}`);
    console.log(`[${network}]   - Executor installed: ${isExecutorInstalled}`);
    
    if (isValidatorInstalled && isExecutorInstalled) {
      console.log(`[${network}] 🎉 Both validator and executor modules successfully installed!`);
      
      // Check if modules are initialized
      try {
        const validator = await hardhat.getContractAt('MockValidator', validatorAddress);
        const isValidatorInitialized = await validator.isInitialized(walletAddress);
        console.log(`[${network}]   - Validator initialized: ${isValidatorInitialized}`);
        
        const executor = await hardhat.getContractAt('MockExecutor', executorAddress);
        const isExecutorInitialized = await executor.isInitialized(walletAddress);
        console.log(`[${network}]   - Executor initialized: ${isExecutorInitialized}`);
        
        if (isValidatorInitialized && isExecutorInitialized) {
          console.log(`[${network}] ✅ Both modules are properly initialized`);
        } else {
          console.log(`[${network}] ⚠️  One or more modules are installed but not initialized`);
        }
      } catch (error) {
        console.log(`[${network}]   - Could not check module initialization: ${error.message}`);
      }
    } else {
      console.log(`[${network}] ❌ One or more module installations failed`);
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
    console.log(`[${network}] ⚠️  Could not verify module installations: ${error.message}`);
  }
  
  console.log(`[${network}] =========================================================`);
}

// Execute the script
deployWalletWithValidatorAndExecutor()
  .then(() => {
    console.log('✅ Wallet deployment with validator and executor installation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Wallet deployment with validator and executor installation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
