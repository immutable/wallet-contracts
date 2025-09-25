import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContractViaCREATE2 } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 2 - Biconomy Implementation
 * Deploy LatestWalletImplLocator for Nexus implementation
 * This step is analogous to the original step2 but will be used to point to Nexus
 */
async function step2(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network, deployerContractAddress } = env;
    const walletImplLocatorAdmin = process.env.WALLET_IMPL_LOCATOR_ADMIN;
    const walletImplChangerAdmin = process.env.WALLET_IMPL_CHANGER_ADMIN;

    console.log(`[${network}] Starting Biconomy deployment step 2...`);
    console.log(`[${network}] CREATE2 Factory address ${deployerContractAddress}`);
    console.log(`[${network}] Wallet ImplLocator Admin address ${walletImplLocatorAdmin}`);
    console.log(`[${network}] Wallet ImplLocator Changer address ${walletImplChangerAdmin}`);

    if (!walletImplLocatorAdmin || !walletImplChangerAdmin) {
        throw new Error('Required environment variables not set');
    }

    await waitForInput();

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);

    // Deploy LatestWalletImplLocator using CREATE2
    console.log(`[${network}] Deploying LatestWalletImplLocator via CREATE2...`);
    let latestWalletImplLocator;
    try {
        latestWalletImplLocator = await deployContractViaCREATE2(env, wallets, 'LatestWalletImplLocator', [
            walletImplLocatorAdmin,
            walletImplChangerAdmin
        ]);
        console.log(`[${network}] LatestWalletImplLocator deployed at: ${latestWalletImplLocator.address}`);
    } catch (error) {
        console.error('Error deploying LatestWalletImplLocator via CREATE2:', error);
        throw error;
    }

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step2.json', JSON.stringify({
        walletImplLocatorAdmin,
        walletImplChangerAdmin,
        latestWalletImplLocator: latestWalletImplLocator.address,
    }, null, 1));

    console.log(`[${network}] Step 2 deployment completed`);
    console.log(`[${network}] LatestWalletImplLocator deployed at: ${latestWalletImplLocator.address}`);

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