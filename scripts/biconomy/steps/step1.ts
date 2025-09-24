import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 1 - Biconomy Implementation
 * Deploy NexusMultiCallDeploy and NexusAccountFactoryTest
 * This step is analogous to the original step1 but uses Biconomy's implementations
 */
async function step1(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network, submitterAddress, signerAddress } = env;
    const multiCallAdminPubKey = process.env.MULTICALL_ADMIN_PUB_KEY;
    const factoryAdminPubKey = process.env.FACTORY_ADMIN_PUB_KEY;

    const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;

    console.log(`[${network}] Starting Biconomy deployment step 1...`);
    console.log(`[${network}] Submitter address ${submitterAddress}`);
    console.log(`[${network}] Signer address ${signerAddress}`);
    console.log(`[${network}] multiCallAdminPubKey ${multiCallAdminPubKey}`);
    console.log(`[${network}] factoryAdminPubKey ${factoryAdminPubKey}`);
    console.log(`[${network}] entryPointAddress ${entryPointAddress}`);

    if (!multiCallAdminPubKey || !factoryAdminPubKey || !entryPointAddress) {
        throw new Error('Required environment variables not set');
    }

    await waitForInput();

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);

    // Deploy Passport MultiCallDeploy (proven working)
    console.log(`[${network}] Deploying MultiCallDeploy (Passport)...`);
    const multiCallDeploy = await deployContract(env, wallets, 'MultiCallDeploy', [
        multiCallAdminPubKey,
        submitterAddress
    ]);

    // Deploy Passport Factory (proven working)
    console.log(`[${network}] Deploying Factory (Passport)...`);
    const factory = await deployContract(env, wallets, 'Factory', [
        factoryAdminPubKey,
        multiCallDeploy.address
    ]);

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step1.json', JSON.stringify({
        multiCallAdminPubKey,
        factoryAdminPubKey,
        multiCallDeploy: multiCallDeploy.address,
        factory: factory.address,
    }, null, 1));

    console.log(`[${network}] Step 1 deployment completed`);
    console.log(`[${network}] MultiCallDeploy (Passport) deployed at: ${multiCallDeploy.address}`);
    console.log(`[${network}] Factory (Passport) deployed at: ${factory.address}`);

    return env;
}

// Execute deployment
step1()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 1 completed successfully`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step1:', err);
        process.exit(1);
    });