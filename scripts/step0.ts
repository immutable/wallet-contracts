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
 * Step 0.
 **/
async function step0(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, submitterAddress } = env;
  const multiCallAdminPubKey = process.env.MULTICALL_ADMIN_PUB_KEY;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Submitter address ${submitterAddress}`);
  console.log(`[${network}] multiCallAdminPubKey ${multiCallAdminPubKey}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- STEP 0: Deployed using deployer key (Orange Key)
  const multiCallDeploy = await deployContract(env, wallets, 'MultiCallDeploy', [multiCallAdminPubKey, submitterAddress]);

  fs.writeFileSync('step0.json', JSON.stringify({
    multiCallAdminPubKey: multiCallAdminPubKey,
    multiCallDeploy: multiCallDeploy.address,
    submitterAddress: submitterAddress,
  }, null, 1));

  return env;
}

// Call primary function
step0()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
