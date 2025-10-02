import * as fs from 'fs';
import * as hre from 'hardhat';
import { createPublicClient, http } from 'viem';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 7 - Biconomy Implementation
 * Deploy MultiCallDeploy, NexusBootstrap and NexusAccountFactory
 * This step is analogous to the original step1 but uses Biconomy's implementations
 */
async function step7(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network, submitterAddress, signerAddress } = env;
    const multiCallAdminPubKey = process.env.MULTICALL_ADMIN_PUB_KEY;
    const factoryAdminPubKey = process.env.FACTORY_ADMIN_PUB_KEY;

    const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;

    console.log(`[${network}] Starting Biconomy deployment step 7...`);
    console.log(`[${network}] Submitter address ${submitterAddress}`);
    console.log(`[${network}] Signer address ${signerAddress}`);
    console.log(`[${network}] multiCallAdminPubKey ${multiCallAdminPubKey}`);
    console.log(`[${network}] factoryAdminPubKey ${factoryAdminPubKey}`);
    console.log(`[${network}] entryPointAddress ${entryPointAddress}`);

    if (!multiCallAdminPubKey || !factoryAdminPubKey || !entryPointAddress) {
        throw new Error('Required environment variables not set');
    }

    // await waitForInput(); // Commented out for automated deployment

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);
    const deployer = wallets.getWallet();

    // Deploy Passport MultiCallDeploy (proven working)
    console.log(`[${network}] Deploying MultiCallDeploy (Passport)...`);
    const multiCallDeploy = await deployContract(env, wallets, 'MultiCallDeploy', [
        multiCallAdminPubKey,
        submitterAddress
    ]);

    console.log(`[${network}] ✅ MultiCallDeploy deployed at: ${multiCallDeploy.address}`);

    // Deploy NexusBootstrap first (dependency of NexusAccountFactory)
    console.log(`[${network}] Deploying NexusBootstrap...`);

    // Read K1Validator address from step4 (should be deployed before step7 in the correct order)
    const step4Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));
    const validatorAddress = step4Data.validator.address;

    if (!validatorAddress) {
        throw new Error('K1Validator address not found in step4.json - ensure step4 runs before step7');
    }

    console.log(`[${network}] Using K1Validator: ${validatorAddress}`);

    // NexusBootstrap constructor needs: (defaultValidator, initData)
    // Use empty initData to prevent K1Validator initialization during bootstrap deployment
    const deployerAddress = await wallets.getWallet().getAddress();
    const bootstrapInitData = '0x';

    const nexusBootstrap = await deployContract(env, wallets, 'NexusBootstrap', [
        validatorAddress,    // K1Validator as default validator
        bootstrapInitData    // Owner address for K1Validator initialization
    ]);

    console.log(`[${network}] ✅ NexusBootstrap deployed at: ${nexusBootstrap.address}`);

    console.log(`[${network}] Deploying NexusAccountFactory...`);

    console.log(`[${network}] Using NexusBootstrap: ${nexusBootstrap.address}`);

    const nexusAccountFactory = await deployContract(env, wallets, 'NexusAccountFactory', [
        factoryAdminPubKey,      // ACCOUNT_IMPLEMENTATION (mantendo como estava)
        multiCallDeploy.address, // owner (mantendo como estava) 
        nexusBootstrap.address   // NEXUS_BOOTSTRAP (usando o recém-deployado)
    ]);

    console.log(`[${network}] ✅ NexusAccountFactory deployed at: ${nexusAccountFactory.address}`);

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

        if (owner.toLowerCase() !== multiCallDeploy.address.toLowerCase()) {
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
        deployer: multiCallDeploy.address, // Use cached address
        network: network,
        deployedAt: new Date().toISOString(),
        codeSize: Math.floor(deployedCode.length / 2),
        simplifiedArchitecture: true
    };

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step7.json', JSON.stringify({
        multiCallAdminPubKey,
        factoryAdminPubKey,
        multiCallDeploy: multiCallDeploy.address,
        nexusBootstrap: nexusBootstrap.address,
        nexusAccountFactory: nexusAccountFactory.address,
        factory: nexusAccountFactory.address,
        validatorAddress,
    }, null, 1));

    console.log(`[${network}] Step 7 deployment completed`);
    console.log(`[${network}] MultiCallDeploy (Passport) deployed at: ${multiCallDeploy.address}`);
    console.log(`[${network}] ✅ Factory deployment skipped - using simplified architecture`);

    return env;
}

// Execute deployment
step7()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 7 completed successfully`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step7:', err);
        process.exit(1);
    });