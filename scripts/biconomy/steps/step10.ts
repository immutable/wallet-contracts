// Step 10: Deploy K1ValidatorFactory (Complete Factory)
import * as hre from 'hardhat';
import * as fs from 'fs';
import { createPublicClient, http, zeroAddress } from 'viem';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions } from '../../wallet-options';

async function deployK1ValidatorFactory() {
    console.log('🔟 STEP 10: DEPLOYING K1VALIDATORFACTORY (COMPLETE FACTORY)');
    console.log('='.repeat(65));

    const env: EnvironmentInfo = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] Starting K1ValidatorFactory deployment...`);

    // Setup wallet
    const walletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();
    const deployerAddress = await deployer.getAddress();

    // Setup viem public client for code verification
    const networkConfig = hre.network.config as any;
    const rpcUrl = networkConfig.url || 'http://localhost:8545';
    const publicClient = createPublicClient({
        transport: http(rpcUrl)
    });

    console.log(`[${network}] Deployer: ${deployerAddress}`);

    try {
        // Load required artifacts from previous steps
        const step4Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));
        const step7Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step7.json', 'utf8'));

        const nexusImplementation = step4Data.nexus;
        const k1Validator = step4Data.validator.address;
        const nexusBootstrap = step7Data.nexusBootstrap;

        console.log(`[${network}] 📋 Using artifacts from previous steps:`);
        console.log(`[${network}]    Nexus Implementation: ${nexusImplementation}`);
        console.log(`[${network}]    K1Validator: ${k1Validator}`);
        console.log(`[${network}]    NexusBootstrap: ${nexusBootstrap}`);

        // Deploy K1ValidatorFactory
        console.log(`\n[${network}] 🚀 Deploying K1ValidatorFactory...`);

        const K1ValidatorFactoryContract = await hre.ethers.getContractFactory('K1ValidatorFactory');
        const k1ValidatorFactory = await K1ValidatorFactoryContract.deploy(
            nexusImplementation,        // ACCOUNT_IMPLEMENTATION
            deployerAddress,            // factoryOwner
            k1Validator,               // K1_VALIDATOR
            nexusBootstrap,            // BOOTSTRAPPER
            zeroAddress                 // REGISTRY (minimal for now) - using viem zeroAddress
        );
        await k1ValidatorFactory.deployed();

        console.log(`[${network}] ✅ K1ValidatorFactory deployed at: ${k1ValidatorFactory.address}`);

        // Verify deployment using viem
        await new Promise(resolve => setTimeout(resolve, 1000));
        const k1FactoryCode = await publicClient.getCode({
            address: k1ValidatorFactory.address as `0x${string}`
        });

        if (!k1FactoryCode || k1FactoryCode === '0x') {
            throw new Error('K1ValidatorFactory deployment verification failed');
        }
        console.log(`[${network}] ✅ K1ValidatorFactory verified with ${Math.floor(k1FactoryCode.length / 2)} bytes`);

        // Test factory configuration
        console.log(`\n[${network}] 🧪 Testing factory configuration...`);

        try {
            const accountImpl = await k1ValidatorFactory.ACCOUNT_IMPLEMENTATION();
            const k1Val = await k1ValidatorFactory.K1_VALIDATOR();
            const bootstrap = await k1ValidatorFactory.BOOTSTRAPPER();
            const registry = await k1ValidatorFactory.REGISTRY();

            console.log(`[${network}]    ✅ ACCOUNT_IMPLEMENTATION: ${accountImpl}`);
            console.log(`[${network}]    ✅ K1_VALIDATOR: ${k1Val}`);
            console.log(`[${network}]    ✅ BOOTSTRAPPER: ${bootstrap}`);
            console.log(`[${network}]    ✅ REGISTRY: ${registry}`);

            // Verify addresses match
            const configCorrect =
                accountImpl.toLowerCase() === nexusImplementation.toLowerCase() &&
                k1Val.toLowerCase() === k1Validator.toLowerCase() &&
                bootstrap.toLowerCase() === nexusBootstrap.toLowerCase();

            if (configCorrect) {
                console.log(`[${network}]    🎉 Factory configuration verified!`);
            } else {
                throw new Error('Factory configuration mismatch');
            }

        } catch (configError) {
            console.log(`[${network}]    ❌ Factory configuration test failed: ${configError.message}`);
            throw configError;
        }

        // Save step results
        const stepResults = {
            timestamp: new Date().toISOString(),
            network: network,
            deployer: deployerAddress,
            step: 10,
            description: 'K1ValidatorFactory (Complete Factory)',

            // Main deployment
            k1ValidatorFactory: k1ValidatorFactory.address,

            // Configuration
            accountImplementation: nexusImplementation,
            k1ValidatorModule: k1Validator,
            bootstrapper: nexusBootstrap,
            registry: zeroAddress, // Use viem zeroAddress

            // Verification
            codeSize: Math.floor(k1FactoryCode.length / 2),
            configurationVerified: true,

            // Status
            status: 'SUCCESS',
            gasUsed: 'N/A' // Could be extracted from deployment transaction if needed
        };

        // Save to step file
        fs.writeFileSync('scripts/biconomy/steps/step10.json', JSON.stringify(stepResults, null, 2));
        console.log(`[${network}] 📁 Step 10 results saved to step10.json`);

        console.log(`\n[${network}] ✅ STEP 10 COMPLETED SUCCESSFULLY`);
        console.log(`[${network}] 🏭 K1ValidatorFactory: ${k1ValidatorFactory.address}`);

        return stepResults;

    } catch (error) {
        console.error(`[${network}] ❌ Step 10 failed:`, error);

        // Save error state
        const errorResults = {
            timestamp: new Date().toISOString(),
            network: network,
            deployer: deployerAddress,
            step: 10,
            description: 'K1ValidatorFactory (Complete Factory)',
            status: 'FAILED',
            error: error.message,
            stack: error.stack
        };

        fs.writeFileSync('scripts/biconomy/steps/step10.json', JSON.stringify(errorResults, null, 2));
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    deployK1ValidatorFactory()
        .then(() => {
            console.log('\n🎉 STEP 10 DEPLOYMENT COMPLETED');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ STEP 10 DEPLOYMENT FAILED:', error);
            process.exit(1);
        });
}

export { deployK1ValidatorFactory };
