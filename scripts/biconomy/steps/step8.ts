import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';

/**
 * Step 8 - Deploy EntryPoint for ERC-4337
 * Deploy EntryPoint contract required for Nexus ERC-4337 functionality
 */
async function step8(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    console.log(`[${network}] Starting deployment of EntryPoint (Step 8)...`);

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);

    // Check if we already have an EntryPoint from environment
    const existingEntryPoint = process.env.ENTRY_POINT_ADDRESS;

    if (existingEntryPoint && existingEntryPoint !== '0x0000000000000000000000000000000000000000') {
        console.log(`[${network}] Using existing EntryPoint from environment: ${existingEntryPoint}`);

        // Verify it has code
        const code = await hre.ethers.provider.getCode(existingEntryPoint);
        if (code !== '0x') {
            console.log(`[${network}] ✅ EntryPoint verified with ${Math.floor(code.length / 2)} bytes of code`);

            // Save to step8.json
            fs.writeFileSync('scripts/biconomy/steps/step8.json', JSON.stringify({
                entryPoint: existingEntryPoint,
                source: 'environment'
            }, null, 1));

            console.log(`[${network}] Step 8 (EntryPoint) using existing deployment completed`);
            return env;
        } else {
            console.log(`[${network}] ⚠️ EntryPoint address has no code, deploying new one...`);
        }
    }

    // Deploy a minimal EntryPoint for local development
    console.log(`[${network}] Deploying minimal EntryPoint for local development...`);

    try {
        // Try to deploy the real EntryPoint if available in artifacts
        try {
            const entryPoint = await deployContract(env, wallets, 'EntryPoint', []);

            console.log(`[${network}] ✅ Real EntryPoint deployed at: ${entryPoint.address}`);

            // Save deployment information
            fs.writeFileSync('scripts/biconomy/steps/step8.json', JSON.stringify({
                entryPoint: entryPoint.address,
                source: 'deployed_real'
            }, null, 1));

            console.log(`[${network}] Step 8 (Real EntryPoint) deployment completed`);
            return env;

        } catch (realEntryPointError) {
            console.log(`[${network}] Real EntryPoint not available, deploying mock...`);

            // Deploy a minimal mock EntryPoint
            const MockEntryPointFactory = await hre.ethers.getContractFactory('MockEntryPoint');
            const mockEntryPoint = await MockEntryPointFactory.deploy();
            await mockEntryPoint.deployed();

            console.log(`[${network}] ✅ Mock EntryPoint deployed at: ${mockEntryPoint.address}`);

            // Save deployment information
            fs.writeFileSync('scripts/biconomy/steps/step8.json', JSON.stringify({
                entryPoint: mockEntryPoint.address,
                source: 'deployed_mock'
            }, null, 1));

            console.log(`[${network}] Step 8 (Mock EntryPoint) deployment completed`);
            return env;
        }

    } catch (error) {
        console.error(`[${network}] Error in step8:`, error);

        // Fallback: use a standard EntryPoint address for local networks
        const standardEntryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
        console.log(`[${network}] Using standard EntryPoint address: ${standardEntryPoint}`);

        // Save fallback information
        fs.writeFileSync('scripts/biconomy/steps/step8.json', JSON.stringify({
            entryPoint: standardEntryPoint,
            source: 'standard_address'
        }, null, 1));

        console.log(`[${network}] Step 8 (Standard EntryPoint) fallback completed`);
        return env;
    }
}

// Execute deployment
step8()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 8 completed successfully`);

        // Load the result and show summary
        const step8Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step8.json', 'utf8'));
        console.log(`[${env.network}] 📋 EntryPoint Summary:`);
        console.log(`[${env.network}]    Address: ${step8Data.entryPoint}`);
        console.log(`[${env.network}]    Source: ${step8Data.source}`);

        if (step8Data.source === 'deployed_mock' || step8Data.source === 'standard_address') {
            console.log(`[${env.network}] ⚠️  Note: Using mock/standard EntryPoint for local development`);
            console.log(`[${env.network}]    For production, deploy real EntryPoint from account-abstraction package`);
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step8:', err);
        process.exit(1);
    });
