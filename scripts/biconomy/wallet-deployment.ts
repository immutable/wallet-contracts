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
 * Deploy a new Nexus-based wallet
 * 
 * This script supports two deployment methods:
 * 1. Simple deployment via NexusAccountFactory
 * 2. Deployment + initial transactions via NexusMultiCallDeploy
 */
async function deployWallet(): Promise<void> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] Starting Nexus wallet deployment...`);

    // Setup wallet options
    const walletOptions: WalletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();
    const networkId = (await hardhat.provider.getNetwork()).chainId;

    console.log(`[${network}] Network ID: ${networkId}`);

    // Load deployed contract addresses
    const artifacts = loadDeploymentArtifacts();

    // Configuration for the new wallet
    const walletConfig: WalletDeploymentConfig = {
        owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Example owner address
        transactions: [
            // Example: Send 1 ETH to another address
            {
                to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                value: ethers.utils.parseEther("1"),
                data: '0x'
            }
        ]
    };

    console.log(`[${network}] Wallet configuration:`);
    console.log(`  - Owner: ${walletConfig.owner}`);
    console.log(`  - Transactions: ${walletConfig.transactions?.length || 0}`);

    // Generate deterministic salt
    const salt = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ['address'],
            [walletConfig.owner]
        )
    );
    console.log(`[${network}] Generated salt: ${salt}`);

    // Prepare initialization data for the K1Validator
    const initData = ethers.utils.defaultAbiCoder.encode(
        ['address'],
        [walletConfig.owner]
    );

    if (walletConfig.transactions && walletConfig.transactions.length > 0) {
        // Deploy using NexusMultiCallDeploy if we have initial transactions
        await deployWithMultiCallDeploy(
            env,
            artifacts,
            initData,
            salt,
            walletConfig,
            networkId
        );
    } else {
        // Simple deployment using NexusAccountFactory
        await deployWithFactory(
            env,
            artifacts,
            initData,
            salt
        );
    }
}

/**
 * Load deployment artifacts from previous steps
 */
function loadDeploymentArtifacts() {
    try {
        const step1 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step1.json', 'utf8'));
        const step2 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step2.json', 'utf8'));
        const step3 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step3.json', 'utf8'));
        const step4 = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));

        return {
            factory: step1.factory,
            multiCallDeploy: step1.multiCallDeploy,
            nexus: step4.nexus,
            defaultValidator: step4.validator.address,
        };
    } catch (error) {
        console.error('Failed to load deployment artifacts. Make sure all steps have been completed.');
        throw error;
    }
}

/**
 * Deploy wallet using NexusAccountFactory
 */
async function deployWithFactory(
    env: EnvironmentInfo,
    artifacts: any,
    initData: string,
    salt: string
) {
    console.log(`[${env.network}] Deploying wallet using NexusAccountFactory...`);

    // Get factory contract
    const factory = await hardhat.getContractAt('NexusAccountFactory', artifacts.factory);

    // Calculate expected address
    const predictedAddress = await factory.getAddress(initData, salt);
    console.log(`[${env.network}] Predicted wallet address: ${predictedAddress}`);

    // Check if wallet already exists
    const walletCode = await hardhat.provider.getCode(predictedAddress);
    if (walletCode !== '0x') {
        console.log(`[${env.network}] Wallet already exists at ${predictedAddress}`);
        return;
    }

    // Deploy wallet
    console.log(`[${env.network}] Creating new wallet...`);
    const tx = await factory.createAccount(initData, salt, {
        gasLimit: process.env.GAS_LIMIT,
        maxFeePerGas: process.env.MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
    });

    console.log(`[${env.network}] Deployment transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[${env.network}] Wallet deployed at: ${predictedAddress}`);
    console.log(`[${env.network}] Gas used: ${receipt.gasUsed.toString()}`);

    await verifyDeployment(predictedAddress, env.network);
}

/**
 * Deploy wallet using NexusMultiCallDeploy
 */
async function deployWithMultiCallDeploy(
    env: EnvironmentInfo,
    artifacts: any,
    initData: string,
    salt: string,
    config: WalletDeploymentConfig,
    networkId: number
) {
    console.log(`[${env.network}] Deploying wallet using NexusMultiCallDeploy...`);

    // Get factory and multicall contracts
    const factory = await hardhat.getContractAt('NexusAccountFactory', artifacts.factory);
    const multiCallDeploy = await hardhat.getContractAt('NexusMultiCallDeploy', artifacts.multiCallDeploy);

    // Calculate expected address
    const predictedAddress = await factory.getAddress(initData, salt);
    console.log(`[${env.network}] Predicted wallet address: ${predictedAddress}`);

    // Check if wallet already exists
    const walletCode = await hardhat.provider.getCode(predictedAddress);
    if (walletCode !== '0x') {
        console.log(`[${env.network}] Wallet already exists at ${predictedAddress}`);
        return;
    }

    // Prepare transactions data
    const transactions = config.transactions?.map(tx => ({
        to: tx.to,
        value: tx.value,
        data: tx.data
    })) || [];

    // Deploy and execute
    console.log(`[${env.network}] Deploying wallet and executing transactions...`);
    const tx = await multiCallDeploy.deployAndExecute(
        predictedAddress,
        artifacts.nexus,
        salt,
        artifacts.factory,
        initData,
        transactions,
        {
            gasLimit: process.env.GAS_LIMIT,
            maxFeePerGas: process.env.MAX_FEE_PER_GAS,
            maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
        }
    );

    console.log(`[${env.network}] Deployment transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[${env.network}] Wallet deployed at: ${predictedAddress}`);
    console.log(`[${env.network}] Gas used: ${receipt.gasUsed.toString()}`);

    await verifyDeployment(predictedAddress, env.network);
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
