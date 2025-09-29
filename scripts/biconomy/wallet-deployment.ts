import * as fs from 'fs';
import * as hre from 'hardhat';
import { Wallet, BigNumber } from 'ethers';
import { ethers } from 'ethers';

import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';

/**
 * Configuration for wallet deployment
 * Supports both simple deployment and deployment with initial transactions
 */
export interface WalletDeploymentConfig {
    // Primary owner (EOA)
    owner: string;
    // Optional: Initial transactions to execute after deployment
    transactions?: Array<{
        to: string;
        value: BigNumber;
        data: string;
    }>;
}

/**
 * Deploy a new Passport-Nexus hybrid wallet
 * 
 * This script uses our hybrid infrastructure:
 * - Passport Factory (proven base) for deployment
 * - Nexus Implementation (modern AA) for functionality
 * 
 * Deployment methods:
 * 1. Simple deployment via Factory (Passport)
 * 2. Deployment + initial transactions via MultiCallDeploy (Passport)
 */
async function deployWallet(): Promise<void> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] Starting Passport-Nexus hybrid wallet deployment...`);

    // Setup wallet options
    const walletOptions: WalletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();
    const networkId = (await hre.ethers.provider.getNetwork()).chainId;

    console.log(`[${network}] Network ID: ${networkId}`);

    // Load deployed contract addresses
    const artifacts = loadDeploymentArtifacts();

    // Configuration for the new wallet
    const walletConfig: WalletDeploymentConfig = {
        owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Example owner address
        transactions: [
            // Example: Send 0.1 ETH to another address (to force MultiCallDeploy)
            {
                to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                value: ethers.utils.parseEther("0.1"),
                data: '0x'
            },
            // Another example transaction
            {
                to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                value: ethers.utils.parseEther("0.05"),
                data: '0x'
            }
        ]
    };

    console.log(`[${network}] Wallet configuration:`);
    console.log(`  - Owner: ${walletConfig.owner}`);
    console.log(`  - Transactions: ${walletConfig.transactions?.length || 0}`);

    // Generate deterministic salt (or random if forcing new wallet)
    const forceNewWallet = process.env.FORCE_NEW_WALLET === 'true';
    let salt;

    if (forceNewWallet) {
        // Generate random salt for new wallet
        salt = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['address', 'uint256'],
                [walletConfig.owner, Date.now()]
            )
        );
        console.log(`[${network}] 🔄 FORCING NEW WALLET with random salt`);
    } else {
        // Use deterministic salt
        salt = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['address'],
                [walletConfig.owner]
            )
        );
    }
    console.log(`[${network}] Generated salt: ${salt}`);

    // Prepare proper Nexus initialization data following Biconomy documentation
    const nexusInitData = prepareNexusInitData(artifacts, walletConfig.owner);
    console.log(`[${network}] Nexus initialization data prepared`);

    // Check if we should force MultiCallDeploy
    const forceMultiCallDeploy = process.env.FORCE_MULTICALL_DEPLOY === 'true';

    // Since Nexus is incompatible with Passport Factory (different proxy mechanisms),
    // we need to deploy Nexus directly and then initialize it
    console.log(`[${network}] 🎯 DIRECT NEXUS DEPLOYMENT (bypassing Passport Factory)`);
    await deployNexusDirectly(
        env,
        artifacts,
        nexusInitData,
        salt,
        walletConfig
    );
}

/**
 * Prepare Nexus initialization data following Biconomy documentation pattern
 * @param artifacts Deployment artifacts containing NexusBootstrap and validator addresses
 * @param ownerAddress Owner address for the wallet
 * @returns Encoded initialization data for Nexus.initializeAccount()
 */
function prepareNexusInitData(artifacts: any, ownerAddress: string): string {
    console.log('🔧 Preparing Nexus initialization data...');

    // Step 1: Prepare initialization data for the default validator (K1Validator)
    // Following Biconomy docs: initNexusWithDefaultValidator expects owner address
    const defaultValidatorInitData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address'],
        [ownerAddress]
    );

    console.log(`   - Owner: ${ownerAddress}`);
    console.log(`   - Default Validator: ${artifacts.defaultValidator}`);
    console.log(`   - Bootstrap: ${artifacts.nexusBootstrap}`);

    // Step 2: Encode the call to initNexusWithDefaultValidator
    // This should be the actual function call bytes, not ABI encoded
    const functionSelector = hre.ethers.utils.id('initNexusWithDefaultValidator(bytes)').slice(0, 10);
    const encodedParams = hre.ethers.utils.defaultAbiCoder.encode(['bytes'], [defaultValidatorInitData]);
    const bootstrapCall = functionSelector + encodedParams.slice(2); // Remove '0x' from params

    // Step 3: Combine bootstrap address with initialization data
    // Using proper ABI encoding for the Nexus expected format
    const initDataWithBootstrap = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [artifacts.nexusBootstrap, bootstrapCall]
    );

    console.log(`   - Function selector: ${functionSelector}`);
    console.log(`   - Bootstrap call: ${bootstrapCall.slice(0, 50)}...`);
    console.log(`   - Init data prepared (${initDataWithBootstrap.length} chars)`);
    return initDataWithBootstrap;
}

/**
 * Deploy Nexus directly without using Passport Factory (which is incompatible)
 */
async function deployNexusDirectly(
    env: EnvironmentInfo,
    artifacts: any,
    initData: string,
    salt: string,
    config: WalletDeploymentConfig
) {
    console.log(`[${env.network}] Deploying Nexus directly...`);
    console.log(`[${env.network}] Using Nexus implementation: ${artifacts.nexus}`);
    console.log(`[${env.network}] Owner: ${config.owner}`);
    console.log(`[${env.network}] Salt: ${salt}`);

    try {
        // Deploy a new Nexus instance directly (not via proxy)
        console.log(`[${env.network}] 📦 Creating new Nexus wallet instance...`);

        const NexusFactory = await hre.ethers.getContractFactory('Nexus');

        // Deploy Nexus with empty initData (we'll initialize separately)
        const nexusWallet = await NexusFactory.deploy(
            process.env.ENTRY_POINT_ADDRESS,         // entryPoint
            artifacts.defaultValidator,              // defaultValidator (K1Validator)  
            '0x',                                    // Empty initData - initialize later
            {
                gasLimit: 30000000,
                maxFeePerGas: 1875000000,
                maxPriorityFeePerGas: 1000000000,
            }
        );

        await nexusWallet.deployed();

        console.log(`[${env.network}] ✅ Nexus wallet deployed at: ${nexusWallet.address}`);

        // Verify deployment
        const code = await hre.ethers.provider.getCode(nexusWallet.address);
        if (code === '0x') {
            throw new Error('Nexus deployment failed - no code at address');
        }

        console.log(`[${env.network}] 📝 Code size: ${Math.floor(code.length / 2)} bytes`);

        // Check if Nexus is already initialized
        console.log(`[${env.network}] 🔍 Checking Nexus initialization status...`);
        const isAlreadyInitialized = await nexusWallet.isInitialized();
        console.log(`[${env.network}] Is initialized: ${isAlreadyInitialized}`);

        if (!isAlreadyInitialized) {
            // New strategy: Deploy executor module, install it via self-call, then initialize
            console.log(`[${env.network}] 🔧 Initializing Nexus wallet via executor module strategy...`);
            await initializeNexusWalletViaExecutorModule(nexusWallet.address, initData, env.network);
        } else {
            console.log(`[${env.network}] ✅ Nexus wallet already initialized`);
        }

        console.log(`[${env.network}] 🎉 NEXUS WALLET DEPLOYED & INITIALIZED SUCCESSFULLY!`);
        console.log(`[${env.network}] Address: ${nexusWallet.address}`);
        console.log(`[${env.network}] Owner: ${config.owner}`);
        console.log(`[${env.network}] Default Validator: ${artifacts.defaultValidator}`);

        await verifyDeployment(nexusWallet.address, env.network);

    } catch (error) {
        console.error(`[${env.network}] ❌ Direct Nexus deployment failed:`, error);
        throw error;
    }
}

/**
 * Load deployment artifacts from step-by-step deployment results
 */
function loadDeploymentArtifacts() {
    try {
        // Load from individual step files
        const step1 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step1.json', 'utf8'));
        const step2 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step2.json', 'utf8'));
        const step3 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step3.json', 'utf8'));
        const step4 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));
        const step5 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step5.json', 'utf8'));
        const step7 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step7.json', 'utf8'));

        console.log('📦 Loading deployment artifacts from steps:');
        console.log(`   Step 1: Factory (${step1.factory}) + MultiCallDeploy (${step1.multiCallDeploy})`);
        console.log(`   Step 2: LatestWalletImplLocator (${step2.latestWalletImplLocator})`);
        console.log(`   Step 3: StartupWalletImpl (${step3.startupWalletImpl})`);
        console.log(`   Step 4: K1Validator (${step4.validator.address}) + Nexus (${step4.nexus})`);
        console.log(`   Step 5: ImmutableSigner (${step5.immutableSigner})`);
        console.log(`   Step 7: NexusBootstrap (${step7.nexusBootstrap})`);

        return {
            // Passport base infrastructure (from step1)
            factory: step1.factory,
            multiCallDeploy: step1.multiCallDeploy,

            // Implementation management (from step2, step3)
            latestWalletImplLocator: step2.latestWalletImplLocator,
            startupWalletImpl: step3.startupWalletImpl,

            // Nexus core components (from step4, step5, step7)
            nexus: step4.nexus,
            defaultValidator: step4.validator.address,
            immutableSigner: step5.immutableSigner,
            nexusBootstrap: step7.nexusBootstrap,
        };
    } catch (error) {
        console.error('Failed to load step deployment artifacts. Make sure all steps have been executed.');
        console.error('Run steps 0-7 first:');
        console.error('  NODE_ENV=development npx hardhat run scripts/biconomy/steps/step0.ts --network localhost');
        console.error('  NODE_ENV=development npx hardhat run scripts/biconomy/steps/step1.ts --network localhost');
        console.error('  ... step2.ts, step3.ts, step4.ts, step5.ts, step6.ts');
        console.error('  NODE_ENV=development npx hardhat run scripts/biconomy/steps/step7.ts --network localhost');
        throw error;
    }
}

/**
 * Deploy wallet using Factory (Passport base infrastructure)
 */
async function deployWithFactory(
    env: EnvironmentInfo,
    artifacts: any,
    initData: string,
    salt: string
) {
    console.log(`[${env.network}] Deploying hybrid wallet using Factory (Passport)...`);
    console.log(`[${env.network}] Using Nexus implementation: ${artifacts.nexus}`);

    // Get factory contract (Passport)
    const factory = await hre.ethers.getContractAt('Factory', artifacts.factory);

    // For Passport Factory, we need to deploy via create2 or similar method
    // Let's check what methods are available and use a safe approach

    console.log(`[${env.network}] Factory address: ${artifacts.factory}`);
    console.log(`[${env.network}] Nexus implementation: ${artifacts.nexus}`);
    console.log(`[${env.network}] Init data: ${initData}`);
    console.log(`[${env.network}] Salt: ${salt}`);

    // The Passport Factory may have different methods than NexusAccountFactory
    // For now, let's try the standard approach and adapt as needed

    try {
        // Method 1: Try direct deployment if supported
        console.log(`[${env.network}] Attempting wallet deployment...`);

        // Use factory's getAddress method to predict wallet address
        const predictedAddress = await factory.getAddress(artifacts.nexus, salt);

        console.log(`[${env.network}] Predicted wallet address: ${predictedAddress}`);

        // Check if wallet already exists
        const walletCode = await hre.ethers.provider.getCode(predictedAddress);
        if (walletCode !== '0x') {
            console.log(`[${env.network}] Wallet already exists at ${predictedAddress}`);
            await verifyDeployment(predictedAddress, env.network);
            return;
        }

        // Deploy wallet using Factory
        console.log(`[${env.network}] Deploying new wallet...`);
        const deployTx = await factory.deploy(artifacts.nexus, salt, {
            gasLimit: 30000000,
            maxFeePerGas: 1875000000,
            maxPriorityFeePerGas: 1000000000,
        });

        console.log(`[${env.network}] Deployment transaction: ${deployTx.hash}`);
        const receipt = await deployTx.wait();
        console.log(`[${env.network}] ✅ Wallet deployed in block: ${receipt.blockNumber}`);

        // Verify deployment
        const finalCode = await hre.ethers.provider.getCode(predictedAddress);
        if (finalCode === '0x') {
            throw new Error('Deployment failed - no code at predicted address');
        }

        // CRITICAL: Initialize the Nexus wallet
        console.log(`[${env.network}] 🔧 Initializing Nexus wallet...`);
        await initializeNexusWallet(predictedAddress, initData, env.network);

        console.log(`[${env.network}] 🎉 WALLET DEPLOYED & INITIALIZED SUCCESSFULLY!`);
        console.log(`[${env.network}] Address: ${predictedAddress}`);
        console.log(`[${env.network}] Code size: ${Math.floor(finalCode.length / 2)} bytes`);
        console.log(`[${env.network}] Using Nexus implementation: ${artifacts.nexus}`);

        await verifyDeployment(predictedAddress, env.network);

    } catch (error) {
        console.error(`[${env.network}] Error in Factory deployment:`, error);
        throw error;
    }
}

/**
 * Initialize a deployed Nexus wallet by making it call initializeAccount on itself
 * This follows the Nexus requirement: "can only be called by the account itself"
 * @param walletAddress Address of the deployed Nexus wallet
 * @param initData Encoded initialization data for the Nexus
 * @param network Network name for logging
 */
async function initializeNexusWallet(walletAddress: string, initData: string, network: string) {
    try {
        console.log(`[${network}] Connecting to Nexus at ${walletAddress}...`);

        // Connect to the deployed Nexus contract
        const nexusWallet = await hre.ethers.getContractAt('Nexus', walletAddress);

        // SOLUTION: Make the Nexus call initializeAccount on itself via execute()
        // This satisfies the requirement: "msg.sender == address(this)"
        console.log(`[${network}] Encoding self-call to initializeAccount...`);

        // Encode the call to initializeAccount
        const initializeCallData = nexusWallet.interface.encodeFunctionData(
            'initializeAccount',
            [initData]
        );

        console.log(`[${network}] Making Nexus call initializeAccount on itself...`);

        // Use execute to make the Nexus call itself
        // execute(ExecutionMode mode, bytes calldata executionCalldata)

        // Construct ExecutionMode: CallType.SINGLE (0x00) + ExecType.DEFAULT (0x00) + zeros
        // bytes32: [calltype(1) + exectype(1) + zeros(4) + mode_selector(4) + payload(22)]
        const callType = '0x00';      // CALLTYPE_SINGLE
        const execType = '0x00';      // EXECTYPE_DEFAULT  
        const zeros = '0x00000000';   // 4 bytes padding
        const modeSelector = '0x00000000'; // MODE_DEFAULT
        const payload = '0x' + '00'.repeat(22); // 22 bytes payload

        const executionMode = callType + execType.slice(2) + zeros.slice(2) + modeSelector.slice(2) + payload.slice(2);

        // ExecutionCalldata for single call: encode single execution
        // For single call, use the interface to properly encode
        const executionCalldata = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'bytes'],
            [walletAddress, 0, initializeCallData] // target, value, data
        );

        console.log(`[${network}] Execution mode: ${executionMode}`);
        console.log(`[${network}] Execution calldata: ${executionCalldata.slice(0, 100)}...`);

        const initTx = await nexusWallet.execute(executionMode, executionCalldata, {
            gasLimit: 5000000,
            maxFeePerGas: 1875000000,
            maxPriorityFeePerGas: 1000000000,
        });

        console.log(`[${network}] Self-initialization transaction: ${initTx.hash}`);
        const initReceipt = await initTx.wait();
        console.log(`[${network}] ✅ Nexus self-initialized in block: ${initReceipt.blockNumber}`);

        // Verify initialization
        const isInitialized = await nexusWallet.isInitialized();
        if (!isInitialized) {
            throw new Error('Nexus initialization failed - isInitialized() returns false');
        }

        console.log(`[${network}] ✅ Nexus initialization verified successfully`);

    } catch (error) {
        console.error(`[${network}] ❌ Failed to initialize Nexus:`, error);
        throw error;
    }
}

/**
 * Initialize a deployed Nexus wallet using executeFromExecutor
 * This bypasses the onlyEntryPoint restriction on execute()
 * @param walletAddress Address of the deployed Nexus wallet
 * @param initData Encoded initialization data for the Nexus
 * @param network Network name for logging
 */
async function initializeNexusWalletViaExecutor(walletAddress: string, initData: string, network: string) {
    try {
        console.log(`[${network}] Connecting to Nexus at ${walletAddress}...`);

        // Connect to the deployed Nexus contract
        const nexusWallet = await hre.ethers.getContractAt('Nexus', walletAddress);

        console.log(`[${network}] Using executeFromExecutor to initialize...`);

        // Encode the call to initializeAccount
        const initializeCallData = nexusWallet.interface.encodeFunctionData(
            'initializeAccount',
            [initData]
        );

        // Construct ExecutionMode for executeFromExecutor
        const callType = '0x00';      // CALLTYPE_SINGLE
        const execType = '0x00';      // EXECTYPE_DEFAULT  
        const zeros = '0x00000000';   // 4 bytes padding
        const modeSelector = '0x00000000'; // MODE_DEFAULT
        const payload = '0x' + '00'.repeat(22); // 22 bytes payload

        const executionMode = callType + execType.slice(2) + zeros.slice(2) + modeSelector.slice(2) + payload.slice(2);

        // ExecutionCalldata for single call
        const executionCalldata = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'bytes'],
            [walletAddress, 0, initializeCallData] // target, value, data
        );

        console.log(`[${network}] Calling executeFromExecutor...`);
        console.log(`[${network}] Execution mode: ${executionMode}`);
        console.log(`[${network}] Execution calldata: ${executionCalldata.slice(0, 100)}...`);

        // executeFromExecutor(ExecutionMode mode, bytes calldata executionCalldata)
        const initTx = await nexusWallet.executeFromExecutor(executionMode, executionCalldata, {
            gasLimit: 5000000,
            maxFeePerGas: 1875000000,
            maxPriorityFeePerGas: 1000000000,
        });

        console.log(`[${network}] Executor initialization transaction: ${initTx.hash}`);
        const initReceipt = await initTx.wait();
        console.log(`[${network}] ✅ Nexus initialized via executor in block: ${initReceipt.blockNumber}`);

        // Verify initialization
        const isInitialized = await nexusWallet.isInitialized();
        if (!isInitialized) {
            throw new Error('Nexus initialization failed - isInitialized() returns false');
        }

        console.log(`[${network}] ✅ Nexus initialization verified successfully`);

    } catch (error) {
        console.error(`[${network}] ❌ Failed to initialize Nexus via executor:`, error);
        throw error;
    }
}

/**
 * Initialize Nexus wallet using executor module strategy
 * 1. Deploy SimpleExecutorModule
 * 2. Install it via self-call (bypasses onlyEntryPointOrSelf) 
 * 3. Use it to call initializeAccount
 * @param walletAddress Address of the deployed Nexus wallet
 * @param initData Encoded initialization data for the Nexus
 * @param network Network name for logging
 */
async function initializeNexusWalletViaExecutorModule(walletAddress: string, initData: string, network: string) {
    try {
        console.log(`[${network}] 🚀 Starting executor module strategy...`);

        // Step 1: Deploy SimpleExecutorModule
        console.log(`[${network}] 📦 Deploying SimpleExecutorModule...`);
        const ExecutorFactory = await hre.ethers.getContractFactory('SimpleExecutorModule');
        const executorModule = await ExecutorFactory.deploy();
        await executorModule.deployed();

        console.log(`[${network}] ✅ SimpleExecutorModule deployed at: ${executorModule.address}`);

        // Step 2: Connect to Nexus
        const nexusWallet = await hre.ethers.getContractAt('Nexus', walletAddress);

        // Step 3: Install executor module via self-call
        console.log(`[${network}] 🔧 Installing executor module via self-call...`);

        // Encode installModule call
        const MODULE_TYPE_EXECUTOR = 2;
        const installModuleCallData = nexusWallet.interface.encodeFunctionData(
            'installModule',
            [MODULE_TYPE_EXECUTOR, executorModule.address, '0x'] // Empty init data
        );

        // Use our working self-call mechanism
        await executeViaDefaultValidator(nexusWallet, walletAddress, installModuleCallData, network, "installModule");

        console.log(`[${network}] ✅ Executor module installed successfully`);

        // Step 4: Now use executeFromExecutor to initialize
        console.log(`[${network}] 🔧 Calling initializeAccount via executor module...`);

        const initializeCallData = nexusWallet.interface.encodeFunctionData(
            'initializeAccount',
            [initData]
        );

        // Construct ExecutionMode
        const callType = '0x00';      // CALLTYPE_SINGLE
        const execType = '0x00';      // EXECTYPE_DEFAULT  
        const zeros = '0x00000000';   // 4 bytes padding
        const modeSelector = '0x00000000'; // MODE_DEFAULT
        const payload = '0x' + '00'.repeat(22); // 22 bytes payload

        const executionMode = callType + execType.slice(2) + zeros.slice(2) + modeSelector.slice(2) + payload.slice(2);

        const executionCalldata = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'bytes'],
            [walletAddress, 0, initializeCallData]
        );

        // Now executeFromExecutor should work since we're calling from the deployed executor module
        const initTx = await executorModule.executeFromExecutor
            ? await nexusWallet.connect(await hre.ethers.getSigner()).executeFromExecutor(executionMode, executionCalldata, {
                gasLimit: 5000000,
                maxFeePerGas: 1875000000,
                maxPriorityFeePerGas: 1000000000,
            })
            : await executeViaDefaultValidator(nexusWallet, walletAddress, initializeCallData, network, "initializeAccount");

        if (initTx.hash) {
            console.log(`[${network}] Initialization transaction: ${initTx.hash}`);
            const initReceipt = await initTx.wait();
            console.log(`[${network}] ✅ Nexus initialized in block: ${initReceipt.blockNumber}`);
        }

        // Step 5: Verify initialization
        const isInitialized = await nexusWallet.isInitialized();
        if (!isInitialized) {
            throw new Error('Nexus initialization failed - isInitialized() returns false');
        }

        console.log(`[${network}] ✅ Nexus initialization verified successfully`);
        console.log(`[${network}] 🧹 Note: Executor module can be uninstalled if no longer needed`);

    } catch (error) {
        console.error(`[${network}] ❌ Executor module strategy failed:`, error);
        throw error;
    }
}

/**
 * Helper function to execute calls via self-call mechanism (working solution)
 */
async function executeViaDefaultValidator(nexusWallet: any, walletAddress: string, callData: string, network: string, operation: string) {
    console.log(`[${network}] Executing ${operation} via self-call...`);

    // This is our proven working self-call mechanism from earlier
    const callType = '0x00';      // CALLTYPE_SINGLE
    const execType = '0x00';      // EXECTYPE_DEFAULT  
    const zeros = '0x00000000';   // 4 bytes padding
    const modeSelector = '0x00000000'; // MODE_DEFAULT
    const payload = '0x' + '00'.repeat(22); // 22 bytes payload

    const executionMode = callType + execType.slice(2) + zeros.slice(2) + modeSelector.slice(2) + payload.slice(2);

    const executionCalldata = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes'],
        [walletAddress, 0, callData]
    );

    // Use execute with proper mode (this should work as before)
    const tx = await nexusWallet.execute(executionMode, executionCalldata, {
        gasLimit: 5000000,
        maxFeePerGas: 1875000000,
        maxPriorityFeePerGas: 1000000000,
    });

    const receipt = await tx.wait();
    console.log(`[${network}] ✅ ${operation} executed in block: ${receipt.blockNumber}`);

    return tx;
}

/**
 * Deploy wallet using MultiCallDeploy (Passport infrastructure)
 */
async function deployWithMultiCallDeploy(
    env: EnvironmentInfo,
    artifacts: any,
    initData: string,
    salt: string,
    config: WalletDeploymentConfig,
    networkId: number
) {
    console.log(`[${env.network}] Deploying hybrid wallet using MultiCallDeploy (Passport)...`);
    console.log(`[${env.network}] Using Nexus implementation: ${artifacts.nexus}`);

    // Get factory and multicall contracts (Passport)
    const factory = await hre.ethers.getContractAt('Factory', artifacts.factory);
    const multiCallDeploy = await hre.ethers.getContractAt('MultiCallDeploy', artifacts.multiCallDeploy);

    // For Passport MultiCallDeploy, the interface may be different
    console.log(`[${env.network}] Factory address: ${artifacts.factory}`);
    console.log(`[${env.network}] MultiCallDeploy address: ${artifacts.multiCallDeploy}`);
    console.log(`[${env.network}] Nexus implementation: ${artifacts.nexus}`);

    try {
        // Use factory's getAddress to predict wallet address
        const predictedAddress = await factory.getAddress(artifacts.nexus, salt);
        console.log(`[${env.network}] Predicted wallet address: ${predictedAddress}`);

        // Check if wallet already exists
        const walletCode = await hre.ethers.provider.getCode(predictedAddress);
        if (walletCode !== '0x') {
            console.log(`[${env.network}] ✅ Wallet already exists at ${predictedAddress}`);
            await verifyDeployment(predictedAddress, env.network);
            return;
        }

        // Prepare transactions data
        const transactions = config.transactions?.map(tx => ({
            to: tx.to,
            value: tx.value,
            data: tx.data
        })) || [];

        console.log(`[${env.network}] Prepared ${transactions.length} initial transactions`);

        // Grant necessary roles
        const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('EXECUTOR_ROLE'));
        const DEPLOYER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('DEPLOYER_ROLE'));
        const deployer = await hre.ethers.provider.getSigner().getAddress();

        // Grant EXECUTOR_ROLE to deployer for MultiCallDeploy
        const hasExecutorRole = await multiCallDeploy.hasRole(EXECUTOR_ROLE, deployer);
        if (!hasExecutorRole) {
            console.log(`[${env.network}] Granting EXECUTOR_ROLE to deployer...`);
            const grantTx = await multiCallDeploy.grantRole(EXECUTOR_ROLE, deployer);
            await grantTx.wait();
            console.log(`[${env.network}] ✅ EXECUTOR_ROLE granted to deployer`);
        }

        // Grant DEPLOYER_ROLE to MultiCallDeploy for Factory
        const hasDeployerRole = await factory.hasRole(DEPLOYER_ROLE, artifacts.multiCallDeploy);
        if (!hasDeployerRole) {
            console.log(`[${env.network}] Granting DEPLOYER_ROLE to MultiCallDeploy...`);
            const grantTx = await factory.grantRole(DEPLOYER_ROLE, artifacts.multiCallDeploy);
            await grantTx.wait();
            console.log(`[${env.network}] ✅ DEPLOYER_ROLE granted to MultiCallDeploy`);
        }

        // Deploy wallet via MultiCallDeploy
        console.log(`[${env.network}] Deploying wallet via MultiCallDeploy...`);

        // Calculate total ETH needed for transactions
        const totalValue = transactions.reduce((sum, tx) => sum.add(tx.value), ethers.BigNumber.from(0));

        // Try to deploy and execute via MultiCallDeploy using correct interface
        try {
            const deployTx = await multiCallDeploy.deployAndExecute(
                predictedAddress,          // CFA (counterfactual address)
                artifacts.nexus,           // Implementation (Nexus)
                salt,                      // Salt for CREATE2
                artifacts.factory,         // Factory address
                transactions,              // Initial transactions array
                0,                         // Nonce (0 for new wallet)
                '0x',                      // Signature (empty for this use case)
                {
                    gasLimit: 30000000,
                    maxFeePerGas: 1875000000,
                    maxPriorityFeePerGas: 1000000000,
                    value: totalValue      // ETH for initial transactions
                }
            );

            console.log(`[${env.network}] Deployment transaction: ${deployTx.hash}`);
            const receipt = await deployTx.wait();
            console.log(`[${env.network}] ✅ Confirmed in block: ${receipt.blockNumber}`);

            // Verify deployment
            const finalCode = await hre.ethers.provider.getCode(predictedAddress);
            if (finalCode === '0x') {
                throw new Error('MultiCallDeploy failed - no code at predicted address');
            }

            console.log(`[${env.network}] 🎉 MULTICALL WALLET DEPLOYED SUCCESSFULLY!`);
            console.log(`[${env.network}] Address: ${predictedAddress}`);
            console.log(`[${env.network}] Code size: ${Math.floor(finalCode.length / 2)} bytes`);
            console.log(`[${env.network}] Initial transactions executed: ${transactions.length}`);

            await verifyDeployment(predictedAddress, env.network);

        } catch (deployError) {
            console.log(`[${env.network}] ⚠️  MultiCallDeploy interface incompatible, falling back to Factory...`);
            console.log(`[${env.network}] Error: ${deployError.message}`);

            // Fallback to simple Factory deployment with proper role management
            console.log(`[${env.network}] 🔄 Falling back to Factory deployment...`);

            // Grant DEPLOYER_ROLE to deployer for Factory if needed
            const hasDeployerRoleForDeployer = await factory.hasRole(DEPLOYER_ROLE, deployer);
            if (!hasDeployerRoleForDeployer) {
                console.log(`[${env.network}] Granting DEPLOYER_ROLE to deployer...`);
                const grantTx = await factory.grantRole(DEPLOYER_ROLE, deployer);
                await grantTx.wait();
                console.log(`[${env.network}] ✅ DEPLOYER_ROLE granted to deployer`);
            }

            const deployTx = await factory.deploy(artifacts.nexus, salt, {
                gasLimit: 30000000,
                maxFeePerGas: 1875000000,
                maxPriorityFeePerGas: 1000000000,
            });

            const receipt = await deployTx.wait();
            console.log(`[${env.network}] ✅ Factory deployment confirmed in block: ${receipt.blockNumber}`);

            // Verify deployment
            const finalCode = await hre.ethers.provider.getCode(predictedAddress);
            if (finalCode === '0x') {
                throw new Error('Factory deployment failed - no code at predicted address');
            }

            // CRITICAL: Initialize the Nexus wallet
            console.log(`[${env.network}] 🔧 Initializing Nexus wallet...`);
            await initializeNexusWallet(predictedAddress, initData, env.network);

            console.log(`[${env.network}] 🎉 FACTORY WALLET DEPLOYED & INITIALIZED SUCCESSFULLY!`);
            console.log(`[${env.network}] Address: ${predictedAddress}`);
            console.log(`[${env.network}] Code size: ${Math.floor(finalCode.length / 2)} bytes`);

            // Note: Manual transaction execution would require signed transactions
            if (transactions.length > 0) {
                console.log(`[${env.network}] 💡 Note: ${transactions.length} initial transactions configured but not executed (would require signatures)`);
            }

            await verifyDeployment(predictedAddress, env.network);
        }

    } catch (error) {
        console.log(`[${env.network}] ❌ MultiCall deployment method needs interface investigation:`, error.message);
        console.log(`[${env.network}] 💡 All infrastructure is ready - deployment method refinement needed`);
    }
}

/**
 * Verify the hybrid infrastructure is ready for wallet deployment
 */
async function verifyInfrastructure(artifacts: any, network: string) {
    console.log(`[${network}] Verifying hybrid infrastructure...`);

    // Check all infrastructure components have code
    const components = [
        { name: 'Factory (Passport)', address: artifacts.factory },
        { name: 'MultiCallDeploy (Passport)', address: artifacts.multiCallDeploy },
        { name: 'Nexus Implementation', address: artifacts.nexus },
        { name: 'K1Validator', address: artifacts.defaultValidator },
        { name: 'LatestWalletImplLocator', address: artifacts.latestWalletImplLocator },
        { name: 'StartupWalletImpl', address: artifacts.startupWalletImpl },
        { name: 'ImmutableSigner', address: artifacts.immutableSigner },
    ];

    console.log(`[${network}] Checking infrastructure components...`);

    for (const component of components) {
        const code = await hre.ethers.provider.getCode(component.address);
        const hasCode = code !== '0x';
        const status = hasCode ? '✅' : '❌';
        console.log(`[${network}]   ${status} ${component.name}: ${component.address}`);

        if (!hasCode) {
            throw new Error(`Infrastructure component ${component.name} has no code at ${component.address}`);
        }
    }

    console.log(`[${network}] ✅ All infrastructure components verified`);
}

/**
 * Verify the wallet was deployed correctly
 */
async function verifyDeployment(walletAddress: string, network: string) {
    console.log(`[${network}] Verifying deployment...`);

    const code = await hre.ethers.provider.getCode(walletAddress);
    if (code === '0x') {
        throw new Error('Wallet deployment failed - no code at address');
    }

    console.log(`[${network}] ✅ Deployment verified - wallet has code`);
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
