import * as fs from 'fs';
import * as hre from 'hardhat';
import { createPublicClient, http } from 'viem';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';

/**
 * Step 9 - Deploy PassportCompatibleNexusFactory (CFA Compatible)
 * Deploy our custom factory that maintains CFA compatibility with old Passport accounts
 * while enabling new Nexus wallet deployments
 */
async function step9(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] Starting deployment of PassportCompatibleNexusFactory (Step 9)...`);

    // Read required addresses from previous steps
    const step1Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step1.json', 'utf8'));
    const step4Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));

    const oldPassportFactory = step1Data.factory;
    const nexusImplementation = step4Data.nexus;

    console.log(`[${network}] Old Passport Factory (for CFA): ${oldPassportFactory}`);
    console.log(`[${network}] Nexus Implementation: ${nexusImplementation}`);

    if (!oldPassportFactory || !nexusImplementation) {
        throw new Error('Required addresses not found in previous step JSON files');
    }

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);
    const deployer = wallets.getWallet();
    const deployerAddress = await deployer.getAddress(); // Cache address

    // Deploy PassportCompatibleNexusFactory
    console.log(`[${network}] Deploying PassportCompatibleNexusFactory...`);
    console.log(`[${network}] - Nexus Implementation: ${nexusImplementation}`);
    console.log(`[${network}] - Old Passport Factory: ${oldPassportFactory}`);
    console.log(`[${network}] - Owner: ${deployerAddress}`);

    const passportCompatibleNexusFactory = await deployContract(env, wallets, 'PassportCompatibleNexusFactory', [
        nexusImplementation,    // Nexus implementation address
        oldPassportFactory,     // Old Passport factory for CFA compatibility
        deployerAddress         // Owner (cached)
    ]);

    // Verify deployment using viem public client
    const networkConfig = hre.network.config as any;
    const rpcUrl = networkConfig.url || 'http://localhost:8545';
    const publicClient = createPublicClient({
        transport: http(rpcUrl)
    });

    const deployedCode = await publicClient.getCode({
        address: passportCompatibleNexusFactory.address as `0x${string}`
    });

    if (!deployedCode || deployedCode === '0x') {
        throw new Error('PassportCompatibleNexusFactory deployment verification failed');
    }

    console.log(`[${network}] ✅ PassportCompatibleNexusFactory deployed successfully`);
    console.log(`[${network}] 📏 Code size: ${Math.floor(deployedCode.length / 2)} bytes`);

    // Test the factory configuration
    console.log(`[${network}] 🔍 Verifying factory configuration...`);

    const PassportCompatibleNexusFactory = await hre.ethers.getContractFactory('PassportCompatibleNexusFactory', deployer);
    const factoryContract = PassportCompatibleNexusFactory.attach(passportCompatibleNexusFactory.address);

    try {
        const [nexusImpl, oldFactory, currentFactory] = await factoryContract.getFactoryAddresses();

        console.log(`[${network}] ✅ Configuration verified:`);
        console.log(`[${network}]    Nexus Implementation: ${nexusImpl}`);
        console.log(`[${network}]    Old Passport Factory: ${oldFactory}`);
        console.log(`[${network}]    Current Factory: ${currentFactory}`);

        if (nexusImpl.toLowerCase() !== nexusImplementation.toLowerCase()) {
            throw new Error('Nexus implementation address mismatch');
        }
        if (oldFactory.toLowerCase() !== oldPassportFactory.toLowerCase()) {
            throw new Error('Old Passport factory address mismatch');
        }

    } catch (verificationError) {
        console.error(`[${network}] ❌ Factory configuration verification failed:`, verificationError);
        throw verificationError;
    }

    // Save deployment information
    const deploymentData = {
        passportCompatibleNexusFactory: passportCompatibleNexusFactory.address,
        nexusImplementation: nexusImplementation,
        oldPassportFactory: oldPassportFactory,
        owner: deployerAddress, // Use cached address
        network: network,
        deployedAt: new Date().toISOString(),
        codeSize: Math.floor(deployedCode.length / 2),
        cfaCompatible: true
    };

    fs.writeFileSync('scripts/biconomy/steps/step9.json', JSON.stringify(deploymentData, null, 2));

    console.log(`[${network}] Step 9 (CFA Compatible Factory) deployment completed`);
    console.log(`[${network}] ✅ PassportCompatibleNexusFactory deployed at: ${passportCompatibleNexusFactory.address}`);
    console.log(`[${network}] 🔄 CFA Compatibility: ENABLED`);
    console.log(`[${network}] 📋 This factory maintains address compatibility with existing Passport accounts`);
    console.log(`[${network}] 📋 while enabling new Nexus wallet deployments`);

    return env;
}

// Execute deployment
step9()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 9 completed successfully`);

        // Load the result and show summary
        const step9Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step9.json', 'utf8'));
        console.log(`[${env.network}] 📋 CFA Compatible Factory Summary:`);
        console.log(`[${env.network}]    Factory Address: ${step9Data.passportCompatibleNexusFactory}`);
        console.log(`[${env.network}]    Nexus Implementation: ${step9Data.nexusImplementation}`);
        console.log(`[${env.network}]    Old Passport Factory: ${step9Data.oldPassportFactory}`);
        console.log(`[${env.network}]    CFA Compatible: ${step9Data.cfaCompatible ? '✅' : '❌'}`);

        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step9:', err);
        process.exit(1);
    });
