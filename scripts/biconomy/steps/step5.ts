import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../../environment';
import { newWalletOptions, WalletOptions } from '../../wallet-options';
import { deployContract } from '../../contract';
import { waitForInput } from '../../helper-functions';

/**
 * Step 5 - Biconomy Implementation
 * Deploy ImmutableSigner for 2x2 signature validation
 * This step is analogous to the original step5 and maintains the same functionality
 * as the ImmutableSigner will be used in conjunction with K1Validator
 */
async function step5(): Promise<EnvironmentInfo> {
    const env = loadEnvironmentInfo(hre.network.name);
    const { network, signerAddress } = env;
    const signerRootAdminPubKey = process.env.SIGNER_ROOT_ADMIN_PUB_KEY;
    const signerAdminPubKey = process.env.SIGNER_ADMIN_PUB_KEY;

    console.log(`[${network}] Starting Biconomy deployment step 5...`);
    console.log(`[${network}] SignerRootAdmin address ${signerRootAdminPubKey}`);
    console.log(`[${network}] SignerAdmin address ${signerAdminPubKey}`);
    console.log(`[${network}] Signer address ${signerAddress}`);

    if (!signerRootAdminPubKey || !signerAdminPubKey || !signerAddress) {
        throw new Error('Required environment variables not set');
    }

    await waitForInput();

    // Setup wallet
    const wallets: WalletOptions = await newWalletOptions(env);

    // Deploy ImmutableSigner
    console.log(`[${network}] Deploying ImmutableSigner...`);
    const immutableSigner = await deployContract(env, wallets, 'ImmutableSigner', [
        signerRootAdminPubKey,
        signerAdminPubKey,
        signerAddress
    ]);

    // Save deployment information
    fs.writeFileSync('scripts/biconomy/steps/step5.json', JSON.stringify({
        signerRootAdminPubKey,
        signerAdminPubKey,
        signerAddress,
        immutableSigner: immutableSigner.address,
    }, null, 1));

    console.log(`[${network}] Step 5 deployment completed`);
    console.log(`[${network}] ImmutableSigner deployed at: ${immutableSigner.address}`);

    return env;
}

// Execute deployment
step5()
    .then((env: EnvironmentInfo) => {
        console.log(`[${env.network}] Step 5 completed successfully`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in step5:', err);
        process.exit(1);
    });
