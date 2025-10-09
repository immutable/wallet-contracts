import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers as hardhat } from 'hardhat';
import { Wallet, BigNumber } from 'ethers';
import { ethers } from 'ethers'

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

  // Passport user wallet owner
  // EOA - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  // Private Key = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  
  // Configuration for the new wallet
  const walletConfig: WalletDeploymentConfig = {
    owners: [
      // {
      //   // address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // hardhat accounts[0] -- base sepolia
      //   // privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // hardhat accounts[0] -- base sepolia
      //   address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // hardhat accounts[1] -- localhost
      //   privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // hardhat accounts[1] -- localhost
      //   weight: 1,
      // },
      // {
      //   address: deploymentArtifacts.immutableSigner, 
      //   weight: 1,
      //   privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' // private key for primarySigner configured in ImmutableSigner contract
      // },
      {
        address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', // accounts[18]
        weight: 1,
        privateKey: '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0' // private key for accounts[18]
      }
    ],
    threshold: 1,
  };
  
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
    target: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', // random address - hardhat accounts[19]
    value: hardhat.utils.parseEther("1"), // 1 ETH
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

  console.log(`[${env.network}] Calling deployAndExecute...`);

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
    // from: '0xccBd3382EA55CF431126Ac5c4E289E100040aa2B', // <-- submitter (gas sponsor) -- base sepolia
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // <-- submitter (gas sponsor) -- localhost
  };

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
  
  // STEP 4: Post-execution verification
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
 * Verify the wallet was deployed correctly
 */
async function verifyDeployment(walletAddress: string, network: string) {
  console.log(`[${network}] Verifying deployment...`);
  
  const code = await hardhat.provider.getCode(walletAddress);
  if (code === '0x') {
    throw new Error('Wallet deployment failed - no code at address');
  }
  
  console.log(`[${network}] ✅ Deployment verified - wallet has code`);
  
//   // Try to connect to the wallet and verify it's working
//   try {
//     const MainModule = await hardhat.getContractFactory('MainModuleDynamicAuthV2');
//     const wallet = MainModule.attach(walletAddress);
    
//     // Check if wallet is initialized (this might fail if not initialized yet)
//     const isInitialized = await wallet.isInitialized().catch(() => false);
//     console.log(`[${network}] Wallet initialization status: ${isInitialized}`);
    
//   } catch (error) {
//     console.log(`[${network}] Note: Could not verify wallet interface (this may be normal)`);
//   }
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
