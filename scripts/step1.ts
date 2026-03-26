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
  const multiCallAdminPubKey = process.env.MULTICALL_ADMIN_PUB_KEY;
  const factoryAdminPubKey = process.env.FACTORY_ADMIN_PUB_KEY;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Submitter address ${submitterAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);
  console.log(`[${network}] multiCallAdminPubKey ${multiCallAdminPubKey}`);
  console.log(`[${network}] factoryAdminPubKey ${factoryAdminPubKey}`);

  // await waitForInput(); // Commented out for automated deployment

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- STEP 1: Deployed using Passport Nonce Reserver.
  // Deploy multi call deploy (PNR) with your funded wallet as executor
  const executorAddress = process.env.COLD_WALLET_ADDRESS || '0xeDC117090236293afEBb179260e8B9dd5bffe4dC';
  console.log(`[${network}] Using executor wallet: ${executorAddress}`);
  const multiCallDeploy = await deployContract(env, wallets, 'MultiCallDeploy', [multiCallAdminPubKey, executorAddress]);

  // Wait for the first deployment to be confirmed
  console.log(`[${env.network}] Waiting for MultiCallDeploy deployment to be confirmed...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Deploy factory with multi call deploy address as deployer role EST (PNR)
  const factory = await deployContract(env, wallets, 'Factory', [factoryAdminPubKey, multiCallDeploy.address]);

  // Save to network-specific directory
  const stepDir = env.network === 'base_sepolia' ? 'scripts/steps/base_sepolia' : 'scripts/steps';
  if (!fs.existsSync(stepDir)) {
    fs.mkdirSync(stepDir, { recursive: true });
  }
  fs.writeFileSync(`${stepDir}/step1.json`, JSON.stringify({
    multiCallAdminPubKey: multiCallAdminPubKey,
    factoryAdminPubKey: factoryAdminPubKey,
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
