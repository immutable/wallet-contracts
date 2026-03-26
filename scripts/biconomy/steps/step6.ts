import * as fs from 'fs';
import * as hre from 'hardhat';
import { Contract, ContractFactory } from 'ethers';
import { parseGwei } from 'viem';
import { newContractFactory, waitForInput } from '../../helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';

/**
 * Step 6 - Biconomy Implementation
 * Update LatestWalletImplLocator to point to Nexus implementation
 * This step is analogous to the original step6 but points to Nexus instead of MainModuleDynamicAuth
 */
async function step6(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network, signerAddress } = env;

    // Read addresses from previous deployment steps
    const step1Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step1.json', 'utf8'));
    const step4Data = JSON.parse(fs.readFileSync('scripts/biconomy/steps/step4.json', 'utf8'));

    const nexusImplAddress = step4Data.nexus;
    const walletImplLocatorContractAddress = step1Data.latestWalletImplLocator;

    console.log(`[${network}] Starting Biconomy deployment step 6...`);
    console.log(`[${network}] Nexus implementation address ${nexusImplAddress}`);
    console.log(`[${network}] WalletImplLocator address ${walletImplLocatorContractAddress}`);
    console.log(`[${network}] Signer address ${signerAddress}`);

    if (!nexusImplAddress || !walletImplLocatorContractAddress) {
        throw new Error('Required addresses not found in step JSON files');
    }

    // await waitForInput(); // Commented out for automated deployment

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);
    console.log(
        `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWallet().getAddress()}`
    );

    // Update implementation address on LatestWalletImplLocator to point to Nexus
    const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), 'LatestWalletImplLocator');
    const walletImplLocator: Contract = contractFactory.attach(walletImplLocatorContractAddress);

    console.log(`[${network}] Updating LatestWalletImplLocator to point to Nexus implementation...`);

    // Use viem for gas configuration with reasonable defaults for localhost
    const gasLimit = process.env.GAS_LIMIT ? parseInt(process.env.GAS_LIMIT) : 500000;

    // For localhost, use simple values. parseGwei('20') = 20 * 10^9 wei
    const maxFeePerGas = parseGwei('20'); // 20 gwei
    const maxPriorityFeePerGas = parseGwei('2'); // 2 gwei

    console.log(`[${network}] Gas configuration:`);
    console.log(`[${network}]   gasLimit: ${gasLimit}`);
    console.log(`[${network}]   maxFeePerGas: ${maxFeePerGas} wei (20 gwei)`);
    console.log(`[${network}]   maxPriorityFeePerGas: ${maxPriorityFeePerGas} wei (2 gwei)`);

    const tx = await walletImplLocator
        .connect(wallets.getWallet())
        .changeWalletImplementation(nexusImplAddress, {
            gasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas,
        });

    await tx.wait();
    console.log(`[${network}] LatestWalletImplLocator implementation updated to: ${nexusImplAddress}`);

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step6.json', JSON.stringify({
        nexusImplAddress,
        walletImplLocatorContractAddress,
        transactionHash: tx.hash,
    }, null, 1));

    return env;
}

// Execute deployment
step6()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 6 completed successfully`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step6:', err);
        process.exit(1);
    });
