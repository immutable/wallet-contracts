import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 2 - Biconomy Implementation
 * Deploy StartupWalletImpl that will be used as initial implementation
 * This step is analogous to the original step3 but will be used with Nexus
 */
async function step2(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    // Read step1 data to get the LatestWalletImplLocator address
    const step1Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step1.json', 'utf8'));
    const walletImplLocatorAddress = step1Data.latestWalletImplLocator;

    console.log(`[${network}] Starting Biconomy deployment step 2...`);
    console.log(`[${network}] WalletImplLocator address ${walletImplLocatorAddress}`);

    if (!walletImplLocatorAddress) {
        throw new Error('WalletImplLocator address not found in step1.json');
    }

    // await waitForInput(); // Commented out for automated deployment

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);

    // Deploy StartupWalletImpl
    console.log(`[${network}] Deploying StartupWalletImpl...`);
    const startupWalletImpl = await deployContract(env, wallets, 'StartupWalletImpl', [walletImplLocatorAddress]);

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step2.json', JSON.stringify({
        walletImplLocatorAddress,
        startupWalletImpl: startupWalletImpl.address,
    }, null, 1));

    console.log(`[${network}] Step 2 deployment completed`);
    console.log(`[${network}] StartupWalletImpl deployed at: ${startupWalletImpl.address}`);

    return env;
}

// Execute deployment
step2()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 2 completed successfully`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step2:', err);
        process.exit(1);
    });