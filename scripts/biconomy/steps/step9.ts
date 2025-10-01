import * as fs from 'fs';
import * as hre from 'hardhat';
import { createPublicClient, http } from 'viem';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';

/**
 * Step 9 - Deploy NexusAccountFactory (Simplified Architecture)
 * Deploy the factory that creates Nexus wallets with CFA compatibility
 * Uses direct Nexus deployment approach for simplified architecture
 */
async function step9(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] Starting deployment of NexusAccountFactory (Step 9)...`);

    // Read required addresses from previous steps
    const step4Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));
    const nexusImplementation = step4Data.nexus;

    console.log(`[${network}] Nexus Implementation: ${nexusImplementation}`);

    if (!nexusImplementation) {
        throw new Error('Nexus implementation not found in step4.json');
    }

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);
    const deployer = wallets.getWallet();
    const deployerAddress = await deployer.getAddress(); // Cache address

    // Deploy NexusAccountFactory (Simplified Architecture)
    console.log(`[${network}] Deploying NexusAccountFactory...`);
    const nexusAccountFactory = await deployContract(env, wallets, 'NexusAccountFactory', [
        nexusImplementation,    // Nexus implementation address
        deployerAddress         // Owner address
    ]);

    console.log(`[${network}] ✅ NexusAccountFactory deployed at: ${nexusAccountFactory.address}`);

    // NOTE: Using simplified architecture - direct Nexus deployment via NexusAccountFactory
    console.log(`[${network}] ✅ Using simplified architecture - direct Nexus deployment`);

    // Verify NexusAccountFactory deployment
    const networkConfig = hre.network.config as any;
    const rpcUrl = networkConfig.url || 'http://localhost:8545';
    const publicClient = createPublicClient({
        transport: http(rpcUrl)
    });

    const deployedCode = await publicClient.getCode({
        address: nexusAccountFactory.address as `0x${string}`
    });

    if (!deployedCode || deployedCode === '0x') {
        throw new Error('NexusAccountFactory deployment verification failed');
    }

    console.log(`[${network}] ✅ NexusAccountFactory deployed successfully`);
    console.log(`[${network}] 📏 Code size: ${Math.floor(deployedCode.length / 2)} bytes`);

    // Test the factory configuration
    console.log(`[${network}] 🔍 Verifying factory configuration...`);

    const NexusAccountFactory = await hre.ethers.getContractFactory('NexusAccountFactory', deployer);
    const factoryContract = NexusAccountFactory.attach(nexusAccountFactory.address);

    try {
        const owner = await factoryContract.owner();
        console.log(`[${network}] ✅ Configuration verified:`);
        console.log(`[${network}]    Factory Owner: ${owner}`);
        console.log(`[${network}]    Nexus Implementation: ${nexusImplementation}`);

        if (owner.toLowerCase() !== deployerAddress.toLowerCase()) {
            throw new Error('Factory owner address mismatch');
        }

    } catch (verificationError) {
        console.error(`[${network}] ❌ Factory configuration verification failed:`, verificationError);
        throw verificationError;
    }

    // Save deployment information
    const deploymentData = {
        // nexusCompatibleMainModule: removed - not needed anymore
        nexusAccountFactory: nexusAccountFactory.address,
        nexusImplementation: nexusImplementation,
        deployer: deployerAddress, // Use cached address
        network: network,
        deployedAt: new Date().toISOString(),
        codeSize: Math.floor(deployedCode.length / 2),
        simplifiedArchitecture: true
    };

    fs.writeFileSync('scripts/biconomy/steps/step9.json', JSON.stringify(deploymentData, null, 2));

    console.log(`[${network}] Step 9 (NexusAccountFactory) deployment completed`);
    console.log(`[${network}] ✅ NexusAccountFactory deployed at: ${nexusAccountFactory.address}`);
    console.log(`[${network}] 🚀 Simplified Architecture: ENABLED`);
    console.log(`[${network}] 📋 Direct Nexus deployment with CFA compatibility`);
    console.log(`[${network}] 📋 No bridge module needed - architecture simplified`);

    return env;
}

// Execute deployment
step9()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 9 completed successfully`);

        // Load the result and show summary
        const step9Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step9.json', 'utf8'));
        console.log(`[${env.network}] 📋 NexusAccountFactory Summary:`);
        console.log(`[${env.network}]    Factory Address: ${step9Data.nexusAccountFactory}`);
        console.log(`[${env.network}]    Nexus Implementation: ${step9Data.nexusImplementation}`);
        console.log(`[${env.network}]    Simplified Architecture: ${step9Data.simplifiedArchitecture ? '✅' : '❌'}`);

        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step9:', err);
        process.exit(1);
    });
