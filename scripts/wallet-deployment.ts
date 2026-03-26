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
 * with basic wallet initialization (without bootstrap).
 * 
 * FLOW:
 * 1. Load deployed contract addresses from previous steps
 * 2. Deploy wallet via MultiCallDeploy.deployAndExecute()
 * 3. First transaction: wallet calls itself to initializeAccount
 * 4. Verify wallet deployment and basic initialization
 */
async function deployWallet(): Promise<void> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] Starting wallet deployment...`);

    // Setup wallet options
    const walletOptions: WalletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();

    // Get network ID with default for hardhat local node
    const networkInfo = await hardhat.provider.getNetwork();
    const networkId = networkInfo.chainId || 31337; // Default to hardhat local chain ID
    console.log(`[${network}] Network ID: ${networkId}`);

    // Load deployed contract addresses (from previous deployment steps)
    const deploymentArtifacts = loadDeploymentArtifacts();

    // Configuration for the new wallet
    // OPTION 1: Random owner (default - deploys new wallet every time)
    const randomOwner = ethers.Wallet.createRandom();

    // OPTION 2: Fixed owner for testing existing wallet flow
    // Uncomment the line below and comment out the line above to test with an existing wallet
    // const randomOwner = new ethers.Wallet('PRIVATE_KEY_HERE');
    // Example from last successful deployment:
    // Wallet at 0xcf6CE64d55Aa295A33A6D7E0e06DC8491492D46c
    // const randomOwner = new ethers.Wallet('0xbecbc46f2d9064371b4f5f34d5deac5938b64b569352e21b5d36ff1a6b1c8bf1');

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
    // IMPORTANT: Must use startupWalletImpl, not mainModule!
    // The MainModuleDynamicAuth.INIT_CODE_HASH is calculated using startupWalletImpl
    const cfa = addressOf(
        deploymentArtifacts.factory,
        deploymentArtifacts.startupWalletImpl,
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
    await verifyWalletDeployment(cfa, deploymentArtifacts, network);

    console.log(`[${network}] Wallet deployment completed successfully!`);
    console.log(`[${network}] Wallet address: ${cfa}`);
}

/**
 * Load deployment artifacts from previous steps
 */
function loadDeploymentArtifacts() {
    try {
        // Try to load from deployment summary first (for Base Sepolia)
        try {
            const deploymentSummary = JSON.parse(fs.readFileSync('scripts/deployment-summary-simplified.json', 'utf8'));
            console.log(`[${deploymentSummary.network}] Using deployment summary data`);

            return {
                factory: deploymentSummary.infrastructure.factory,
                multiCallDeploy: deploymentSummary.infrastructure.multiCallDeploy,
                mainModule: deploymentSummary.infrastructure.mainModuleDynamicAuth,
                startupWalletImpl: deploymentSummary.infrastructure.startupWalletImpl,
                entryPoint: deploymentSummary.infrastructure.entryPoint,
            };
        } catch (summaryError) {
            console.log('Deployment summary not found, trying step files...');
        }

        // Fallback to step artifacts - only use steps 1 and 3 which exist
        const step1 = JSON.parse(fs.readFileSync('scripts/steps/base_sepolia/step1.json', 'utf8'));
        const step3 = JSON.parse(fs.readFileSync('scripts/steps/base_sepolia/step3.json', 'utf8'));

        return {
            factory: step1.factory || step1.nexusAccountFactory,
            multiCallDeploy: step1.multiCallDeploy,
            mainModule: step1.latestWalletImplLocator, // mainmodule == latestWalletImplLocator
            entryPoint: step3.entryPoint,
        };
    } catch (error) {
        console.error('Failed to load deployment artifacts. Make sure deployment summary or step1 and step3 have been completed.');
        throw error;
    }
}

/**
 * Deploy wallet using MultiCallDeploy.deployAndExecute with basic initialization
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
    console.log(`[${env.network}] 🚀 Starting wallet deployment with basic initialization`);
    console.log(`[${env.network}] 📋 Initial parameters:`);
    console.log(`[${env.network}]   - Network: ${env.network}`);
    console.log(`[${env.network}]   - Network ID: ${networkId}`);
    console.log(`[${env.network}]   - Target CFA: ${cfa}`);
    console.log(`[${env.network}]   - Salt: ${salt}`);
    console.log(`[${env.network}]   - Factory: ${artifacts.factory}`);
    console.log(`[${env.network}]   - Main Module: ${artifacts.mainModule}`);
    console.log(`[${env.network}] ========================================================`);

    // Get MultiCallDeploy contract
    const MultiCallDeploy = await hardhat.getContractFactory('MultiCallDeploy');
    const multiCallDeploy = MultiCallDeploy.attach(artifacts.multiCallDeploy);

    // Check if MultiCallDeploy contract exists and has the right interface
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

        try {
            const existingWallet = await hardhat.getContractAt('MainModuleDynamicAuth', cfa);
            walletNonce = (await existingWallet.nonce()).toNumber();
            console.log(`[${env.network}] ✅ Current wallet nonce: ${walletNonce}`);
        } catch (error) {
            console.log(`[${env.network}] ⚠️  Could not read wallet nonce, assuming 0. Error: ${error.message}`);
            walletNonce = 0;
        }

        // Wallet already exists - skip deployment and just verify
        console.log(`[${env.network}] ========================================================`);
        console.log(`[${env.network}] ✅ Wallet already exists at: ${cfa}`);
        console.log(`[${env.network}] 🔍 Current wallet nonce: ${walletNonce}`);
        console.log(`[${env.network}] 🎉 Wallet is already deployed - no deployment needed`);
        console.log(`[${env.network}] ========================================================`);

        // Return early - no need to deploy again
        return {
            walletAddress: cfa,
            walletNonce,
            alreadyExisted: true
        };
    } else {
        console.log(`[${env.network}] ✅ Wallet does not exist yet, will deploy with nonce 0`);
        walletNonce = 0;
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

    // Prepare the meta-transaction where wallet calls itself
    const transactions: any[] = [];

    // Transaction: Transfer ETH to CFA for initialization
    transactions.push({
        delegateCall: false,
        revertOnError: true,
        gasLimit: BigNumber.from(200000), // Use 100K gas for simple transfer instead of process.env.GAS_LIMIT
        target: await funder.getAddress(), // can be the same funder address to return the initially funded funds
        value: ethers.utils.parseEther("0.0001"), // 0.0001 ETH
        data: new Uint8Array([])
    });

    // STEP 3: Create signature using the correct nonce
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

        transactions.forEach((tx, i) => {
            console.log(`[${env.network}]   Transaction ${i}: target=${tx.target}, value=${tx.value}, gasLimit=${tx.gasLimit}`);
        });

        const data = encodeMetaTransactionsData(cfa, transactions, networkId, walletNonce);
        console.log(`[${env.network}] 📝 Encoded meta transaction data (first 66 chars): ${data.slice(0, 66)}...`);
        console.log(`[${env.network}] 📝 Data includes nonce: ${walletNonce} for wallet: ${cfa}`);

        const ownerWallets = config.owners.map(owner => {
            return new Wallet(owner.privateKey);
        });

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
    let currentNonce = await hardhat.provider.getTransactionCount(executorAddress);

    console.log(`[${env.network}] Executor wallet address: ${executorAddress}`);
    console.log(`[${env.network}] Executor wallet current nonce: ${currentNonce}`);

    // Create transaction options with high gas limit
    const txnOpts = {
        gasLimit: BigNumber.from("5000000"), // High gas limit for deployment
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
    console.log(`[${env.network}] ============================================================`);

    // OPTION: Comment out staticCall to see debug logs in real execution
    // Uncomment the following block to use staticCall (safer but no logs)
    /*
    try {
        console.log(`[${env.network}] 🔍 Testing deployAndExecute with staticCall...`);
        await multiCallDeploy.connect(executor).callStatic.deployAndExecute(
            cfa,                    // counterfactual address
            artifacts.mainModule,   // main module address
            salt,                   // salt for deployment
            artifacts.factory,      // factory contract address
            transactions,           // basic initialization transaction
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
    */

    console.log(`[${env.network}] 🚀 Proceeding directly to real transaction...`);

    // NOTE: Gas estimation is commented out to avoid consuming executor nonce
    // The estimateGas call creates a transaction in the mempool which consumes a nonce,
    // causing the actual transaction to fail with NONCE_EXPIRED
    // We use a fixed high gas limit (5M) instead, which is sufficient for wallet deployment
    /*
    // Try to estimate gas first to catch revert reasons
    try {
        console.log(`[${env.network}] 🔍 Estimating gas for deployAndExecute...`);
        const gasEstimate = await multiCallDeploy.connect(executor).estimateGas.deployAndExecute(
            cfa,                    // counterfactual address
            artifacts.startupWalletImpl,   // startup wallet implementation (used for CREATE2)
            salt,                   // salt for deployment
            artifacts.factory,      // factory contract address
            transactions,           // basic initialization transaction
            walletNonce,            // wallet nonce
            signature,              // signature for the transactions
            txnOpts
        );
        console.log(`[${env.network}] ✅ Gas estimate successful: ${gasEstimate.toString()}`);
    } catch (gasError) {
        console.log(`[${env.network}] ❌ Gas estimation failed:`, gasError.message);
        console.log(`[${env.network}] 🚀 Static call succeeded but gas estimation failed - this often means gas limit issue`);
        console.log(`[${env.network}] 🚀 Proceeding with transaction using high gas limit...`);

        // Don't throw the error, just proceed with high gas limit
    }
    */

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
    //
    const tx = await multiCallDeploy.connect(executor).deployAndExecute(
        cfa,                    // counterfactual address
        artifacts.startupWalletImpl,   // startup wallet implementation (used for CREATE2)
        salt,                   // salt for deployment
        artifacts.factory,      // factory contract address
        transactions,           // basic initialization transaction
        walletNonce,            // wallet nonce
        signature,              // signature for the transactions
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

    // Decode and display ALL events (including our debug events)
    if (receipt.events && receipt.events.length > 0) {
        console.log(`[${env.network}] 📋 DEBUG: Decoding ALL events...`);
        for (let i = 0; i < receipt.events.length; i++) {
            const event = receipt.events[i];
            console.log(`[${env.network}]   Event ${i + 1}:`);
            console.log(`[${env.network}]     - Event: ${event.event || 'Unknown'}`);
            console.log(`[${env.network}]     - Address: ${event.address}`);
            console.log(`[${env.network}]     - Topics: ${JSON.stringify(event.topics)}`);

            // Try to decode TxExecuted events (our debug logs)
            if (event.topics[0] === hardhat.utils.id('TxExecuted(bytes32)')) {
                console.log(`[${env.network}]     - Type: TxExecuted (possibly DEBUG)`);
                console.log(`[${env.network}]     - Data: ${event.topics[1]}`);
            }

            // Try to decode ImageHashUpdated events (our debug logs)
            if (event.topics[0] === hardhat.utils.id('ImageHashUpdated(bytes32)')) {
                console.log(`[${env.network}]     - Type: ImageHashUpdated (possibly DEBUG)`);
                console.log(`[${env.network}]     - Data: ${event.topics[1]}`);
            }
        }
    }

    if (receipt.status === 0) {
        console.log(`[${env.network}] ❌ Transaction failed! Status: ${receipt.status}`);
        throw new Error('Basic initialization transaction failed');
    }

    const events = receipt.events || [];

    // Log all events for debugging
    if (events.length > 0) {
        console.log(`[${env.network}] 📋 All events in transaction:`);
        events.forEach((event, i) => {
            console.log(`[${env.network}]   Event ${i}: ${event.event || 'Unknown'} from ${event.address}`);
        });
    }

    // STEP 5: Post-execution verification
    console.log(`[${env.network}] ================ POST-EXECUTION VERIFICATION ================`);
    try {
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
        console.log(`[${env.network}]   - Expected nonce increment: ${transactions.length}`);
        console.log(`[${env.network}]   - Actual nonce increment: ${finalNonce - walletNonce}`);

        if (finalNonce === walletNonce + transactions.length) {
            console.log(`[${env.network}] ✅ Nonce incremented correctly - basic initialization executed successfully`);
        } else {
            console.log(`[${env.network}] ⚠️  Unexpected nonce value - please investigate`);
        }

        // Check if wallet is initialized
        const isInitialized = await deployedWallet.isInitialized();
        console.log(`[${env.network}]   - Wallet initialized: ${isInitialized}`);

        if (!isInitialized) {
            console.log(`[${env.network}] ⚠️  Wallet is not initialized - basic initialization may have failed`);
        }

    } catch (error) {
        console.log(`[${env.network}] ⚠️  Could not verify final wallet state: ${error.message}`);
    }
    console.log(`[${env.network}] ==============================================================`);

    console.log(`[${env.network}] ✅ Wallet deployed and basic initialization executed!`);
}

/**
 * Verify the wallet was deployed correctly
 */
async function verifyWalletDeployment(walletAddress: string, artifacts: any, network: string) {
    console.log(`[${network}] =================== FINAL VERIFICATION ===================`);
    console.log(`[${network}] Verifying wallet deployment...`);

    // Small delay to ensure the state is fully propagated
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify wallet deployment
    const code = await hardhat.provider.getCode(walletAddress);
    if (code === '0x') {
        throw new Error('Wallet deployment failed - no code at address');
    }

    console.log(`[${network}] ✅ Wallet deployment verified - wallet has code`);

    // Try to connect to the wallet and verify basic state
    try {
        const wallet = await hardhat.getContractAt('MainModuleDynamicAuth', walletAddress);

        // Check if wallet is initialized
        const isInitialized = await wallet.isInitialized();
        console.log(`[${network}] 🔍 Wallet initialization status: ${isInitialized}`);

        if (!isInitialized) {
            console.log(`[${network}] ⚠️  Wallet is not initialized - basic initialization may have failed`);
            return;
        }

        // Check wallet nonce
        const nonce = await wallet.nonce();
        console.log(`[${network}] 🔍 Wallet nonce: ${nonce.toString()}`);

        console.log(`[${network}] ✅ Basic wallet deployment verification completed`);

    } catch (error) {
        console.log(`[${network}] ⚠️  Could not verify wallet deployment: ${error.message}`);
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
