import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContract } from '../contract';


/**
 * Step 5 - V2 Deployment
 **/
async function step5(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress, } = env;
  const signerRootAdminPubKey = process.env.SIGNER_ROOT_ADMIN_PUB_KEY;
  const signerAdminPubKey = process.env.SIGNER_ADMIN_PUB_KEY;

  console.log(`[${network}] Starting V2 deployment...`);
  console.log(`[${network}] SignerRootAdmin address ${signerRootAdminPubKey}`);
  console.log(`[${network}] SignerAdmin address ${signerAdminPubKey}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 5: Deployed using Passport Nonce Reserver.
  // Deploy immutable signer (PNR)
  const immutableSigner = await deployContract(env, wallets, 'ImmutableSigner', [signerRootAdminPubKey, signerAdminPubKey, signerAddress]);

  fs.writeFileSync('scripts/v2/step5.json', JSON.stringify({
    signerRootAdminPubKey: signerRootAdminPubKey,
    signerAdminPubKey: signerAdminPubKey,
    signerAddress: signerAddress,
    immutableSigner: immutableSigner.address,
  }, null, 1));

  return env;
}

// Call primary function
step5()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
