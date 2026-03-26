import * as fs from 'fs';
import * as hre from 'hardhat';
import { createPublicClient, http } from 'viem';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 0 - Deploy OwnableCreate2Deployer
 * This is a prerequisite for all other steps as they use CREATE2 for deterministic addresses
 */
async function step0(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network, submitterAddress, signerAddress } = env;

    console.log(`[${network}] Starting Biconomy deployment step 0...`);
    console.log(`[${network}] Submitter address ${submitterAddress}`);
    console.log(`[${network}] Signer address ${signerAddress}`);

    // await waitForInput(); // Commented out for automated deployment

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);
    const deployer = wallets.getWallet();
    const deployerAddress = await deployer.getAddress(); // Get address using ethers method

    // Deploy OwnableCreate2Deployer
    console.log(`[${network}] Deploying OwnableCreate2Deployer...`);
    const create2Deployer = await deployContract(env, wallets, 'OwnableCreate2Deployer', [
        deployerAddress // Owner of the deployer (use deployer as owner)
    ]);

    // Verify deployment using viem public client
    const networkConfig = hre.network.config as any;
    const rpcUrl = networkConfig.url || 'http://localhost:8545';
    const publicClient = createPublicClient({
        transport: http(rpcUrl)
    });

    const deployedCode = await publicClient.getCode({
        address: create2Deployer.address as `0x${string}`
    });

    if (!deployedCode || deployedCode === '0x') {
        throw new Error('OwnableCreate2Deployer deployment verification failed');
    }

    console.log(`[${network}] ✅ OwnableCreate2Deployer deployed successfully`);
    console.log(`[${network}] 📏 Code size: ${Math.floor(deployedCode.length / 2)} bytes`);

    // Save deployment information
    const deploymentData = {
        create2DeployerAddress: create2Deployer.address,
        owner: deployerAddress, // Use cached address
        network: network,
        deployedAt: new Date().toISOString(),
        codeSize: Math.floor(deployedCode.length / 2)
    };

    fs.writeFileSync('scripts/biconomy/steps/step0.json', JSON.stringify(deploymentData, null, 2));

    console.log(`[${network}] Step 0 deployment completed`);
    console.log(`[${network}] OwnableCreate2Deployer deployed at: ${create2Deployer.address}`);
    console.log(`[${network}] Owner: ${deployerAddress}`); // Use cached address
    console.log(`[${network}] 📋 IMPORTANT: Update DEPLOYER_CONTRACT_ADDRESS in .env to: ${create2Deployer.address}`);
    console.log(`[${network}] 📋 This deployer will be used for deterministic CREATE2 deployments in subsequent steps`);

    return env;
}

// Execute deployment
step0()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 0 completed successfully`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step0:', err);
        process.exit(1);
    });