import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { deployContract } from './contract';
import { waitForInput } from './helper-functions';

// Addresses that need to be pre-determined
// 1. Factory
// 2. StartupWalletImpl
// 3. SignerContract

/**
 * Step 1.
 **/
async function step1(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, submitterAddress, signerAddress, } = env;
  const multiCallAdminPubKey = '0x575be326c482a487add43974e0eaf232e3366e13';
  const factoryAdminPubKey = '0xddb70ddcd14dbd57ae18ec591f47454e4fc818bb';

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Submitter address ${submitterAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);
  console.log(`[${network}] multiCallAdminPubKey ${multiCallAdminPubKey}`);
  console.log(`[${network}] factoryAdminPubKey ${factoryAdminPubKey}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- STEP 1: Deployed using Passport Nonce Reserver.
  // Deploy multi call deploy (PNR)
  const multiCallDeploy = await deployContract(env, wallets, 'MultiCallDeploy', [multiCallAdminPubKey, submitterAddress]);

  // Deploy factory with multi call deploy address as deployer role EST (PNR)
  const factory = await deployContract(env, wallets, 'Factory', [factoryAdminPubKey, multiCallDeploy.address]);

  fs.writeFileSync('step1.json', JSON.stringify({
    multiCallDeploy: multiCallDeploy.address,
    factory: factory.address,
  }, null, 1));

  return env;
}

// Call primary function
step1()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
