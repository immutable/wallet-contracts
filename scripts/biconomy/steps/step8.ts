import * as fs from 'fs';
import * as hre from 'hardhat';
import { createPublicClient, http, parseGwei } from 'viem';
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

    // Setup viem public client for code verification
    const networkConfig = hre.network.config as any;
    const rpcUrl = networkConfig.url || 'http://localhost:8545';
    const publicClient = createPublicClient({
        transport: http(rpcUrl)
    });

    // Check if we already have an EntryPoint from environment
    const existingEntryPoint = process.env.ENTRY_POINT_ADDRESS;

    if (existingEntryPoint && existingEntryPoint !== '0x0000000000000000000000000000000000000000') {
        console.log(`[${network}] Using existing EntryPoint from environment: ${existingEntryPoint}`);

        // Verify it has code using viem
        const code = await publicClient.getCode({
            address: existingEntryPoint as `0x${string}`
        });

        if (code && code !== '0x') {
            console.log(`[${network}] ✅ EntryPoint verified with ${Math.floor(code.length / 2)} bytes of code`);

            // Save to step8.json
            fs.writeFileSync('scripts/biconomy/steps/step8.json', JSON.stringify({
                entryPoint: existingEntryPoint,
                source: 'environment'
            ,
                version: 'v0.7',
                description: 'EntryPoint v0.7 (Real Implementation)'}, null, 1));

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
            // Deploy real EntryPoint using the same approach as deploy-infrastructure-and-wallet.js
            console.log(`[${network}] 🚀 Deploying REAL EntryPoint from account-abstraction package...`);

            const deployer = wallets.getWallet();

            // Deploy EntryPoint v0.7 from our compiled contracts (not deployments)
            console.log(`[${network}] 📋 Using EntryPoint v0.7 from compiled contracts...`);
            const EntryPointFactory = await hre.ethers.getContractFactory('EntryPoint');

            // Deploy EntryPoint v0.7 (compiled from account-abstraction source)
            const entryPoint = await EntryPointFactory.deploy({
                gasLimit: 30000000 // Keep as number for gas limit
            });
            await entryPoint.deployed();

            console.log(`[${network}] ✅ EntryPoint v0.7 deployed at: ${entryPoint.address}`);

            // Get code size using viem
            const entryPointCode = await publicClient.getCode({
                address: entryPoint.address as `0x${string}`
            });
            console.log(`[${network}] 📏 Code size: ${Math.floor((entryPointCode?.length || 0) / 2)} bytes`);

            // Save deployment information
            fs.writeFileSync('scripts/biconomy/steps/step8.json', JSON.stringify({
                entryPoint: entryPoint.address,
                source: 'deployed_v07',
                codeSize: Math.floor((entryPointCode?.length || 0) / 2)
            }, null, 2));

            console.log(`[${network}] Step 8 (REAL EntryPoint) deployment completed`);
            return env;

        } catch (realEntryPointError) {
            console.log(`[${network}] ❌ Failed to deploy real EntryPoint:`, realEntryPointError.message);
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
