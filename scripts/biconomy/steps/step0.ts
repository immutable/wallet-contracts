import * as fs from 'fs';
import * as hre from 'hardhat';
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

    await waitForInput();

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);

    // Deploy OwnableCreate2Deployer
    console.log(`[${network}] Deploying OwnableCreate2Deployer...`);
    const create2Deployer = await deployContract(env, wallets, 'OwnableCreate2Deployer', [
        submitterAddress // Owner of the deployer
    ]);

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step0.json', JSON.stringify({
        create2DeployerAddress: create2Deployer.address,
    }, null, 1));

    console.log(`[${network}] Step 0 deployment completed`);
    console.log(`[${network}] OwnableCreate2Deployer deployed at: ${create2Deployer.address}`);
    console.log(`[${network}] IMPORTANT: Update DEPLOYER_CONTRACT_ADDRESS in .env to: ${create2Deployer.address}`);

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