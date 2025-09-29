import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 7 - Deploy NexusBootstrap
 * Deploy NexusBootstrap contract needed for Nexus initialization
 */
async function step7(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;

    // Read K1Validator address from step4
    const step4Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));
    const validatorAddress = step4Data.validator.address;

    console.log(`[${network}] Starting deployment of NexusBootstrap...`);
    console.log(`[${network}] K1Validator address: ${validatorAddress}`);

    if (!validatorAddress) {
        throw new Error('K1Validator address not found in step4.json');
    }

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);

    // Deploy NexusBootstrap with K1Validator as default validator
    console.log(`[${network}] Deploying NexusBootstrap...`);

    // NexusBootstrap constructor needs: (defaultValidator, initData)
    // For bootstrap, we can use empty initData since it's meant for initialization delegation
    const bootstrapInitData = '0x';

    const nexusBootstrap = await deployContract(env, wallets, 'NexusBootstrap', [
        validatorAddress,    // K1Validator as default validator
        bootstrapInitData    // Empty init data for bootstrap
    ]);

    console.log(`[${network}] ✅ NexusBootstrap deployed at: ${nexusBootstrap.address}`);

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step7.json', JSON.stringify({
        nexusBootstrap: nexusBootstrap.address,
        validatorAddress,
    }, null, 1));

    console.log(`[${network}] Step 7 (NexusBootstrap) deployment completed`);
    console.log(`[${network}] ✅ NexusBootstrap deployed at: ${nexusBootstrap.address}`);

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
