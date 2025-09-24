import * as fs from 'fs';
import * as hre from 'hardhat';
import { utils } from 'ethers';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContractViaCREATE2 } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 4 - Biconomy Implementation
 * Deploy Nexus core implementation (replacing MainModuleDynamicAuth)
 * This step is analogous to the original step4 but uses Nexus as the core implementation
 */
async function step4(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network, submitterAddress, signerAddress } = env;

    // Load step1 data for factory address
    const step1Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step1.json', 'utf8'));
    const factoryAddress = step1Data.factory;

    // Load step3 data for startup wallet impl address
    const step3Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step3.json', 'utf8'));
    const startupWalletImplAddress = step3Data.startupWalletImpl;

    // Get entry point address from env
    const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;
    const defaultValidatorAddress = process.env.DEFAULT_VALIDATOR_ADDRESS;

    console.log(`[${network}] Starting Biconomy deployment step 4...`);
    console.log(`[${network}] Factory address ${factoryAddress}`);
    console.log(`[${network}] StartupWalletImpl address ${startupWalletImplAddress}`);
    console.log(`[${network}] EntryPoint address ${entryPointAddress}`);
    console.log(`[${network}] DefaultValidator address ${defaultValidatorAddress}`);

    if (!entryPointAddress || !defaultValidatorAddress) {
        throw new Error('Required environment variables not set');
    }

    await waitForInput();

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);
    const deployerAddress = await wallets.getWallet().getAddress();

    // Deploy new K1Validator
    console.log(`[${network}] Deploying new K1Validator...`);
    const validator = await deployContractViaCREATE2(env, wallets, 'K1Validator', []);

    // Initialize K1Validator with deployer's address as owner
    console.log(`[${network}] Initializing K1Validator...`);
    const validatorInitData = utils.hexConcat([deployerAddress]);
    console.log(`[${network}] K1Validator init data: ${validatorInitData}`);
    const tx = await validator.onInstall(validatorInitData);
    await tx.wait();
    console.log(`[${network}] K1Validator initialized`);

    // Deploy Nexus implementation
    console.log(`[${network}] Deploying Nexus implementation...`);
    const nexus = await deployContractViaCREATE2(env, wallets, 'Nexus', [
        entryPointAddress,
        validator.address,
        validatorInitData // Pass the same initData used to initialize K1Validator
    ]);

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step4.json', JSON.stringify({
        factoryAddress,
        startupWalletImplAddress,
        entryPointAddress,
        validator: {
            address: validator.address,
            owner: deployerAddress,
            initData: validatorInitData
        },
        nexus: nexus.address,
    }, null, 1));

    console.log(`[${network}] Step 4 deployment completed`);
    console.log(`[${network}] K1Validator deployed at: ${validator.address}`);
    console.log(`[${network}] K1Validator owner set to: ${deployerAddress}`);
    console.log(`[${network}] Nexus implementation deployed at: ${nexus.address}`);
    console.log(`[${network}] IMPORTANT: Update DEFAULT_VALIDATOR_ADDRESS in .env to: ${validator.address}`);

    return env;
}

// Execute deployment
step4()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 4 completed successfully`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step4:', err);
        process.exit(1);
    });