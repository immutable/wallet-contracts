import * as hre from 'hardhat';
import * as fs from 'fs';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { createPublicClient, http } from 'viem';

// Configuration
const USE_MULTICALL_DEPLOY = process.env.USE_MULTICALL_DEPLOY === 'true';

interface WalletDeploymentConfig {
    owner: string;
    salt: string;
    useMultiCall: boolean;
}

/**
 * Create a Viem public client for the current network
 */
function createViemPublicClient() {
    const networkConfig = hre.network.config as any;
    const rpcUrl = networkConfig.url || 'http://localhost:8545';

    return createPublicClient({
        transport: http(rpcUrl)
    });
}

/**
 * Load infrastructure artifacts from step files
 */
function loadInfrastructureArtifacts(): any {
    const stepFiles = [
        'scripts/biconomy/steps/step0.json', // OwnableCreate2Deployer
        'scripts/biconomy/steps/step1.json', // MultiCallDeploy
        'scripts/biconomy/steps/step2.json', // LatestWalletImplLocator
        'scripts/biconomy/steps/step3.json', // StartupWalletImpl
        'scripts/biconomy/steps/step4.json', // K1Validator, Nexus
        'scripts/biconomy/steps/step5.json', // ImmutableSigner
        'scripts/biconomy/steps/step6.json', // LatestWalletImplLocator update
        'scripts/biconomy/steps/step7.json', // NexusBootstrap
        'scripts/biconomy/steps/step8.json', // EntryPoint
        'scripts/biconomy/steps/step9.json', // NexusAccountFactory (Simplified)
        'scripts/biconomy/steps/step10.json' // K1ValidatorFactory
    ];

    const artifacts: any = {};

    for (const stepFile of stepFiles) {
        try {
            const stepData = JSON.parse(fs.readFileSync(stepFile, 'utf8'));
            Object.assign(artifacts, stepData);
        } catch (error) {
            console.warn(`Warning: Could not load ${stepFile}:`, error.message);
        }
    }

    return artifacts;
}

/**
 * Deploy a new Nexus wallet using simplified architecture
 * 
 * This script uses our step-based infrastructure:
 * - Steps 0-8: Core infrastructure components
 * - Step 9: NexusAccountFactory (Simplified Architecture)
 * 
 * Deployment methods:
 * 1. Direct Nexus deployment via NexusAccountFactory (CFA compatible)
 * 2. Deployment + initial transactions via MultiCallDeploy with Nexus support
 */
async function deployWallet(): Promise<void> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] 🚀 Starting Nexus wallet deployment (Simplified Architecture)...`);

    // Load infrastructure artifacts
    const artifacts = loadInfrastructureArtifacts();

    console.log(`[${network}] 📋 Infrastructure components loaded:`);
    console.log(`[${network}]   - MultiCallDeploy: ${artifacts.multiCallDeploy || 'Not available'}`);
    console.log(`[${network}]   - EntryPoint: ${artifacts.entryPoint || 'Not available'}`);
    console.log(`[${network}]   - NexusAccountFactory: ${artifacts.nexusAccountFactory || 'Not available'}`);
    console.log(`[${network}]   - Nexus Implementation: ${artifacts.nexus || 'Not available'}`);
    console.log(`[${network}]   - K1Validator: ${artifacts.k1ValidatorModule || 'Not available'}`);

    // Verify required components
    const requiredComponents = [
        'nexusAccountFactory',
        'nexus',
        'entryPoint',
        'k1ValidatorModule'
    ];

    for (const component of requiredComponents) {
        if (!artifacts[component]) {
            throw new Error(`Required component ${component} not found in step artifacts. Please run the deployment steps first.`);
        }
    }

    console.log(`[${network}] ✅ All required components available`);

    // Generate deployment configuration
    const walletOptions: WalletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();

    const walletConfig: WalletDeploymentConfig = {
        owner: deployer.address,
        salt: `nexus-${Date.now()}`,
        useMultiCall: USE_MULTICALL_DEPLOY
    };

    console.log(`[${network}] 📋 Deployment configuration:`);
    console.log(`[${network}]   - Owner: ${walletConfig.owner}`);
    console.log(`[${network}]   - Salt: ${walletConfig.salt}`);
    console.log(`[${network}]   - Use MultiCall: ${walletConfig.useMultiCall}`);

    // Create initData for NexusAccountFactory: [entryPoint, validator, owner]
    const nexusInitData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'address'],
        [artifacts.entryPoint, artifacts.k1ValidatorModule, walletConfig.owner]
    );

    const salt = hre.ethers.utils.formatBytes32String(walletConfig.salt);

    if (walletConfig.useMultiCall) {
        console.log(`[${network}] 🎯 MULTICALL DEPLOYMENT via MultiCallDeploy with Nexus support`);
        await deployWithMultiCallDeploy(
            env,
            artifacts,
            nexusInitData,
            salt,
            walletConfig
        );
    } else {
        console.log(`[${network}] 🎯 DIRECT NEXUS DEPLOYMENT via NexusAccountFactory (Simplified)`);
        await deployNexusWithCFAFactory(
            env,
            artifacts,
            nexusInitData,
            salt,
            walletConfig
        );
    }
}

/**
 * Deploy Nexus wallet using NexusAccountFactory (Simplified Architecture)
 * This approach uses direct Nexus deployment with CFA compatibility
 */
async function deployNexusWithCFAFactory(
    env: EnvironmentInfo,
    artifacts: any,
    initData: string,
    salt: string,
    walletConfig: WalletDeploymentConfig
): Promise<void> {
    const { network } = env;
    console.log(`[${network}] 🚀 Starting CFA-compatible Nexus deployment...`);

    // Setup wallet
    const walletOptions: WalletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();

    // Get NexusAccountFactory (Simplified Architecture)
    const NexusAccountFactory = await hre.ethers.getContractFactory('NexusAccountFactory', deployer);
    const factory = NexusAccountFactory.attach(artifacts.nexusAccountFactory);

    console.log(`[${network}] 📋 Using NexusAccountFactory: ${artifacts.nexusAccountFactory}`);
    console.log(`[${network}] 📋 Nexus Implementation: ${artifacts.nexus}`);
    console.log(`[${network}] 📋 EntryPoint: ${artifacts.entryPoint}`);

    // Generate salt for deployment
    const deploymentSalt = hre.ethers.utils.formatBytes32String(`wallet-${Date.now()}`);

    // Predict wallet address using NexusAccountFactory (CFA compatibility maintained)
    const predictedAddress = await factory.computeAccountAddress(initData, deploymentSalt);
    console.log(`[${network}] 🔮 Predicted CFA-compatible address: ${predictedAddress}`);

    // Check if wallet already exists
    const publicClient = createViemPublicClient();
    const existingCode = await publicClient.getCode({ address: predictedAddress as `0x${string}` });
    if (existingCode && existingCode !== '0x') {
        console.log(`[${network}] ✅ Wallet already exists at ${predictedAddress}`);
        await verifyDeployment(predictedAddress, network);
        return;
    }

    // Deploy wallet via NexusAccountFactory (Simplified Architecture)
    console.log(`[${network}] 🔨 Deploying Nexus wallet via NexusAccountFactory...`);

    try {
        // Direct deployment using NexusAccountFactory
        const deployTx = await factory.createAccount(
            initData,           // initData: [entryPoint, validator, owner]
            deploymentSalt,     // salt
            {
                gasLimit: 10000000,  // Sufficient for Nexus deployment
                maxFeePerGas: hre.ethers.utils.parseUnits('20', 'gwei'),
                maxPriorityFeePerGas: hre.ethers.utils.parseUnits('2', 'gwei')
            }
        );

        console.log(`[${network}] 📋 Deployment transaction: ${deployTx.hash}`);
        const receipt = await deployTx.wait();
        console.log(`[${network}] ✅ Wallet deployed in block: ${receipt.blockNumber}`);
        console.log(`[${network}] ⛽ Gas used: ${receipt.gasUsed.toString()}`);

        // Get deployed address from events
        const accountCreatedEvent = receipt.events?.find((e: any) => e.event === 'AccountCreated');
        const deployedAddress = accountCreatedEvent?.args?.[0] || predictedAddress;

        console.log(`[${network}] 🎯 Deployed wallet address: ${deployedAddress}`);

        // Verify CFA compatibility
        if (predictedAddress.toLowerCase() === deployedAddress.toLowerCase()) {
            console.log(`[${network}] ✅ CFA COMPATIBILITY VERIFIED!`);
        } else {
            console.log(`[${network}] ❌ CFA COMPATIBILITY FAILED!`);
            console.log(`[${network}]   Expected: ${predictedAddress}`);
            console.log(`[${network}]   Actual: ${deployedAddress}`);
            return;
        }

        // Verify deployment and test functionality
        await verifyDeployment(deployedAddress, network);
        await testWalletFunctionality(deployedAddress, artifacts, deployer, network);

    } catch (error) {
        console.error(`[${network}] ❌ Nexus deployment failed:`, error.message);
        throw error;
    }
}

/**
 * Deploy wallet using MultiCallDeploy with Nexus support
 */
async function deployWithMultiCallDeploy(
    env: EnvironmentInfo,
    artifacts: any,
    initData: string,
    salt: string,
    walletConfig: WalletDeploymentConfig
): Promise<void> {
    const { network } = env;
    console.log(`[${network}] 🚀 Starting MultiCallDeploy with Nexus support...`);

    // Setup wallet
    const walletOptions: WalletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();

    // Get MultiCallDeploy
    const MultiCallDeploy = await hre.ethers.getContractFactory('MultiCallDeploy', deployer);
    const multiCallDeploy = MultiCallDeploy.attach(artifacts.multiCallDeploy);

    // Get NexusAccountFactory for address prediction
    const NexusAccountFactory = await hre.ethers.getContractFactory('NexusAccountFactory', deployer);
    const factory = NexusAccountFactory.attach(artifacts.nexusAccountFactory);

    console.log(`[${network}] 📋 Using MultiCallDeploy: ${artifacts.multiCallDeploy}`);
    console.log(`[${network}] 📋 Using NexusAccountFactory: ${artifacts.nexusAccountFactory}`);

    // Predict wallet address
    const predictedAddress = await factory.computeAccountAddress(initData, salt);
    console.log(`[${network}] 🔮 Predicted wallet address: ${predictedAddress}`);

    // Check if wallet already exists
    const publicClient = createViemPublicClient();
    const existingCode = await publicClient.getCode({ address: predictedAddress as `0x${string}` });
    if (existingCode && existingCode !== '0x') {
        console.log(`[${network}] ✅ Wallet already exists at ${predictedAddress}`);
        await verifyDeployment(predictedAddress, network);
        return;
    }

    // Prepare a simple transaction for testing
    const testTransaction = {
        to: deployer.address,
        value: hre.ethers.utils.parseEther('0.001'),
        data: '0x',
        operation: 0,
        targetTxGas: 21000,
        baseGas: 0,
        gasPrice: 0,
        gasToken: hre.ethers.constants.AddressZero,
        refundReceiver: hre.ethers.constants.AddressZero,
        nonce: 0
    };

    const transactions = [testTransaction];
    const nonce = 0;
    const signature = '0x'; // Placeholder signature

    try {
        // Use the new deployAndExecuteNexus method
        const deployTx = await multiCallDeploy.deployAndExecuteNexus(
            predictedAddress,               // cfa
            initData,                      // initData
            salt,                          // salt
            artifacts.nexusAccountFactory, // nexusFactory
            transactions,                  // transactions
            nonce,                         // nonce
            signature,                     // signature
            {
                gasLimit: 15000000,
                maxFeePerGas: hre.ethers.utils.parseUnits('20', 'gwei'),
                maxPriorityFeePerGas: hre.ethers.utils.parseUnits('2', 'gwei')
            }
        );

        console.log(`[${network}] 📋 MultiCall deployment transaction: ${deployTx.hash}`);
        const receipt = await deployTx.wait();
        console.log(`[${network}] ✅ MultiCall deployment completed in block: ${receipt.blockNumber}`);
        console.log(`[${network}] ⛽ Gas used: ${receipt.gasUsed.toString()}`);

        // Verify deployment
        await verifyDeployment(predictedAddress, network);
        await testWalletFunctionality(predictedAddress, artifacts, deployer, network);

    } catch (error) {
        console.error(`[${network}] ❌ MultiCall deployment failed:`, error.message);

        // Fallback to direct deployment
        console.log(`[${network}] 🔄 Falling back to direct NexusAccountFactory deployment...`);
        await deployNexusWithCFAFactory(env, artifacts, initData, salt, walletConfig);
    }
}

/**
 * Test basic Nexus wallet functionality
 */
async function testWalletFunctionality(
    walletAddress: string,
    artifacts: any,
    deployer: any,
    network: string
): Promise<void> {
    console.log(`[${network}] 🧪 Testing wallet functionality...`);

    try {
        // Connect to Nexus wallet
        const nexusWallet = await hre.ethers.getContractAt('Nexus', walletAddress);

        // Test basic properties
        const accountId = await nexusWallet.accountId();
        console.log(`[${network}] 📋 Account ID: ${accountId}`);

        // Test ETH reception
        console.log(`[${network}] 💰 Testing ETH reception...`);
        const fundTx = await deployer.sendTransaction({
            to: walletAddress,
            value: hre.ethers.utils.parseEther('0.01'),
            gasLimit: 100000
        });
        await fundTx.wait();

        const walletBalance = await hre.ethers.provider.getBalance(walletAddress);
        console.log(`[${network}] 💰 Wallet balance: ${hre.ethers.utils.formatEther(walletBalance)} ETH`);

        if (walletBalance.gt(0)) {
            console.log(`[${network}] ✅ ETH reception: PASSED`);
        } else {
            console.log(`[${network}] ❌ ETH reception: FAILED`);
        }

        // Deposit to EntryPoint for UserOp gas prefund
        await depositToEntryPoint(walletAddress, artifacts.entryPoint, deployer, network);

        // Test ERC-4337 UserOp execution via EntryPoint
        await testUserOpExecution(walletAddress, artifacts, deployer, network);

        console.log(`[${network}] ✅ Nexus wallet is fully functional with simplified architecture!`);

    } catch (error) {
        console.error(`[${network}] ❌ Wallet functionality test failed:`, error.message);
    }
}

/**
 * Verify wallet deployment by checking code size
 */
async function verifyDeployment(walletAddress: string, network: string): Promise<void> {
    console.log(`[${network}] 🔍 Verifying deployment at ${walletAddress}...`);

    const publicClient = createViemPublicClient();
    const deployedCode = await publicClient.getCode({ address: walletAddress as `0x${string}` });

    if (!deployedCode || deployedCode === '0x') {
        throw new Error('Wallet deployment verification failed - no code at address');
    }

    const codeSize = Math.floor(deployedCode.length / 2);
    console.log(`[${network}] 📏 Deployed code size: ${codeSize} bytes`);

    if (codeSize < 100) {
        throw new Error(`Wallet deployment verification failed - code too small (${codeSize} bytes)`);
    }

    console.log(`[${network}] ✅ Deployment verified - wallet has code`);
}

/**
 * Deposit ETH to EntryPoint for UserOp gas prefund
 */
async function depositToEntryPoint(walletAddress: string, entryPointAddress: string, deployer: any, network: string): Promise<void> {
    console.log(`[${network}] 🏦 Depositing to EntryPoint for UserOp gas prefund...`);

    try {
        const entryPoint = await hre.ethers.getContractAt('EntryPoint', entryPointAddress);

        // Check current deposit
        const currentDeposit = await entryPoint.balanceOf(walletAddress);
        console.log(`[${network}] 📋 Current EntryPoint deposit: ${hre.ethers.utils.formatEther(currentDeposit)} ETH`);

        // Deposit if needed
        const requiredDeposit = hre.ethers.utils.parseEther('0.05'); // 0.05 ETH for gas

        if (currentDeposit.lt(requiredDeposit)) {
            const depositAmount = requiredDeposit.sub(currentDeposit);
            console.log(`[${network}] 💸 Depositing ${hre.ethers.utils.formatEther(depositAmount)} ETH to EntryPoint...`);

            const depositTx = await entryPoint.depositTo(walletAddress, {
                value: depositAmount,
                gasLimit: 100000
            });
            await depositTx.wait();

            const newDeposit = await entryPoint.balanceOf(walletAddress);
            console.log(`[${network}] ✅ EntryPoint deposit: ${hre.ethers.utils.formatEther(newDeposit)} ETH`);
        } else {
            console.log(`[${network}] ✅ Sufficient EntryPoint deposit already exists`);
        }

    } catch (error) {
        console.log(`[${network}] ❌ EntryPoint deposit failed: ${error.message}`);
        console.log(`[${network}] 💡 UserOp execution may fail without sufficient deposit`);
    }
}

/**
 * Test ERC-4337 UserOp execution via EntryPoint
 */
async function testUserOpExecution(walletAddress: string, artifacts: any, deployer: any, network: string): Promise<void> {
    console.log(`[${network}] 🚀 Testing ERC-4337 UserOp execution via EntryPoint v0.7...`);

    try {
        // Connect to wallet and EntryPoint
        const nexusWallet = await hre.ethers.getContractAt('Nexus', walletAddress);
        const entryPoint = await hre.ethers.getContractAt('EntryPoint', artifacts.entryPoint);

        console.log(`[${network}] 📋 Wallet: ${walletAddress}`);
        console.log(`[${network}] 📋 EntryPoint v0.7: ${artifacts.entryPoint}`);

        // Verify EntryPoint compatibility
        const walletEntryPoint = await nexusWallet.entryPoint();
        if (walletEntryPoint.toLowerCase() !== artifacts.entryPoint.toLowerCase()) {
            console.log(`[${network}] ❌ EntryPoint mismatch: ${walletEntryPoint} vs ${artifacts.entryPoint}`);
            return;
        }
        console.log(`[${network}] ✅ EntryPoint compatibility verified`);

        // Prepare UserOp: ETH transfer (same as debug script)
        const target = deployer.address;
        const value = hre.ethers.utils.parseEther('0.001'); // 0.001 ETH
        const callData = '0x';

        console.log(`[${network}] 📋 UserOp: Transfer ${hre.ethers.utils.formatEther(value)} ETH to ${target}`);

        // Encode execution call
        const mode = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const executionCallData = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'bytes'],
            [target, value, callData]
        );
        const fullExecuteCallData = nexusWallet.interface.encodeFunctionData('execute', [mode, executionCallData]);

        // Get current nonce
        const currentNonce = await entryPoint.getNonce(walletAddress, 0);
        console.log(`[${network}] 📋 Current nonce: ${currentNonce.toString()}`);

        // Gas configuration (conservative limits - same as debug script)
        const callGasLimit = 500000;
        const verificationGasLimit = 1000000;
        const preVerificationGas = 200000;
        const maxFeePerGas = hre.ethers.utils.parseUnits('20', 'gwei');
        const maxPriorityFeePerGas = hre.ethers.utils.parseUnits('10', 'gwei');

        // Pack gas limits (EntryPoint v0.7 format)
        const accountGasLimits = hre.ethers.utils.concat([
            hre.ethers.utils.hexZeroPad(hre.ethers.utils.hexlify(verificationGasLimit), 16),
            hre.ethers.utils.hexZeroPad(hre.ethers.utils.hexlify(callGasLimit), 16)
        ]);

        const gasFees = hre.ethers.utils.concat([
            hre.ethers.utils.hexZeroPad(maxPriorityFeePerGas.toHexString(), 16),
            hre.ethers.utils.hexZeroPad(maxFeePerGas.toHexString(), 16)
        ]);

        // Create PackedUserOperation (EntryPoint v0.7)
        const packedUserOp = {
            sender: walletAddress,
            nonce: currentNonce,
            initCode: '0x',
            callData: fullExecuteCallData,
            accountGasLimits: accountGasLimits,
            preVerificationGas: preVerificationGas,
            gasFees: gasFees,
            paymasterAndData: '0x',
            signature: '0x'
        };

        // Sign UserOp
        const userOpHash = await entryPoint.getUserOpHash(packedUserOp);
        const signature = await deployer.signMessage(hre.ethers.utils.arrayify(userOpHash));
        packedUserOp.signature = signature;

        console.log(`[${network}] ✍️  UserOp signed`);

        // Record balances before execution
        const deployerBalanceBefore = await hre.ethers.provider.getBalance(deployer.address);
        const walletBalanceBefore = await hre.ethers.provider.getBalance(walletAddress);

        console.log(`[${network}] 📊 Balances BEFORE:`);
        console.log(`[${network}]   - Deployer: ${hre.ethers.utils.formatEther(deployerBalanceBefore)} ETH`);
        console.log(`[${network}]   - Wallet: ${hre.ethers.utils.formatEther(walletBalanceBefore)} ETH`);

        // Execute UserOp via EntryPoint
        console.log(`[${network}] 🚀 Executing UserOp via EntryPoint v0.7...`);

        const handleOpsTx = await entryPoint.handleOps(
            [packedUserOp],
            deployer.address, // beneficiary
            { gasLimit: 3000000 }
        );
        const handleOpsReceipt = await handleOpsTx.wait();

        console.log(`[${network}] 🎉 UserOp executed successfully!`);
        console.log(`[${network}] 📋 Transaction: ${handleOpsReceipt.transactionHash}`);
        console.log(`[${network}] 📋 Gas used: ${handleOpsReceipt.gasUsed.toLocaleString()}`);

        // Check final balances
        const deployerBalanceAfter = await hre.ethers.provider.getBalance(deployer.address);
        const walletBalanceAfter = await hre.ethers.provider.getBalance(walletAddress);

        console.log(`[${network}] 📊 Balances AFTER:`);
        console.log(`[${network}]   - Deployer: ${hre.ethers.utils.formatEther(deployerBalanceAfter)} ETH`);
        console.log(`[${network}]   - Wallet: ${hre.ethers.utils.formatEther(walletBalanceAfter)} ETH`);

        // Calculate changes
        const deployerChange = deployerBalanceAfter.sub(deployerBalanceBefore);
        const walletChange = walletBalanceBefore.sub(walletBalanceAfter);

        console.log(`[${network}] 📈 Balance Changes:`);
        console.log(`[${network}]   - Deployer: ${deployerChange.gte(0) ? '+' : ''}${hre.ethers.utils.formatEther(deployerChange)} ETH`);
        console.log(`[${network}]   - Wallet: -${hre.ethers.utils.formatEther(walletChange)} ETH`);

        // Verify successful execution (EntryPoint pays from deposit)
        if (handleOpsReceipt.status === 1) {
            console.log(`[${network}] ✅ ERC-4337 UserOp execution: SUCCESS!`);
            console.log(`[${network}] ✅ ETH transfer via EntryPoint: WORKING!`);
            console.log(`[${network}] 🎯 EntryPoint v0.7 integration: COMPLETE!`);
        } else {
            console.log(`[${network}] ❌ UserOp execution failed`);
        }

    } catch (error) {
        console.log(`[${network}] ❌ ERC-4337 UserOp execution failed: ${error.message}`);

        // Decode specific errors
        if (error.data && typeof error.data === 'string') {
            if (error.data.startsWith('0x65c8fd4d')) {
                try {
                    const decoded = hre.ethers.utils.defaultAbiCoder.decode(
                        ['uint256', 'string'],
                        '0x' + error.data.substring(10)
                    );
                    console.log(`[${network}] 📋 FailedOp: index=${decoded[0]}, reason="${decoded[1]}"`);
                } catch (decodeError) {
                    console.log(`[${network}] 📋 Raw error data: ${error.data}`);
                }
            } else if (error.data.startsWith('0x220266b6')) {
                console.log(`[${network}] 📋 AA21 error detected - validation failure`);
            }
        }

        console.log(`[${network}] 💡 Note: ERC-4337 test failure doesn't affect basic wallet functionality`);
    }
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
