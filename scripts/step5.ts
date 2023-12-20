import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { deployContract } from './contract';
import { waitForInput } from './helper-functions';

/**
 * main function deploys all the SCW infrastructure.
 **/
async function step5(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress, } = env;
  // const signerRootAdminPubKey = '0x65af83f71a05d7f6d06ef9a57c9294b4128ccc2c';
  // const signerAdminPubKey = '0x69d09644159e7327dbfd0af9a66f8e332c593e79';
  const signerRootAdminPubKey = process.env.SIGNER_ROOT_ADMIN_PUB_KEY;
  const signerAdminPubKey = process.env.SIGNER_ADMIN_PUB_KEY;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] SignerRootAdmin address ${signerRootAdminPubKey}`);
  console.log(`[${network}] SignerAdmin address ${signerAdminPubKey}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 5: Deployed using Passport Nonce Reserver.
  // Deploy immutable signer (PNR)
  const immutableSigner = await deployContract(env, wallets, 'ImmutableSigner', [signerRootAdminPubKey, signerAdminPubKey, signerAddress]);

  fs.writeFileSync('step5.json', JSON.stringify({
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
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
