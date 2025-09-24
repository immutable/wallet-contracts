import * as fs from 'fs';
import * as hre from 'hardhat';
import { utils } from 'ethers';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';
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

    //if (!entryPointAddress || !defaultValidatorAddress) {
    if (!entryPointAddress) {
        throw new Error('Required environment variables not set');
    }

    await waitForInput();

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);
    const deployerAddress = await wallets.getWallet().getAddress();

    // Deploy K1Validator (Nexus core validator)
    console.log(`[${network}] Deploying K1Validator (Nexus core)...`);
    const validator = await deployContract(env, wallets, 'K1Validator', []);

    // Deploy Nexus Implementation (integrating with Passport infrastructure)
    console.log(`[${network}] Deploying Nexus implementation...`);
    const validatorInitData = utils.hexConcat([deployerAddress]);
    console.log(`[${network}] K1Validator init data: ${validatorInitData}`);

    // Deploy Nexus (core smart account implementation)
    const nexus = await deployContract(env, wallets, 'Nexus', [
        entryPointAddress,      // EntryPoint for Account Abstraction
        validator.address,      // K1Validator for signature validation
        validatorInitData      // Initialization data for the validator
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
    console.log(`[${network}] ✅ K1Validator (Nexus) deployed at: ${validator.address}`);
    console.log(`[${network}] ✅ Nexus implementation deployed at: ${nexus.address}`);
    console.log(`[${network}] 🔗 Integration: Passport Factory + Nexus Core`);
    console.log(`[${network}] 📝 IMPORTANT: Update DEFAULT_VALIDATOR_ADDRESS in .env to: ${validator.address}`);

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