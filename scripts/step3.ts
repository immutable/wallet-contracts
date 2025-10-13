import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { deployContract } from './contract';
import { waitForInput } from './helper-functions';

/**
 * Step 3
 **/
async function step3(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;

  // Load step2 data for walletImplLocator address
  const stepDir = network === 'base_sepolia' ? 'scripts/steps/base_sepolia' : 'scripts/steps';
  const step2Path = `${stepDir}/step2.json`;

  if (!fs.existsSync(step2Path)) {
    throw new Error(`Step 2 not found at ${step2Path}. Please run step 2 first.`);
  }

  const step2Data = JSON.parse(fs.readFileSync(step2Path, 'utf8'));
  const walletImplLocatorAddress = step2Data.latestWalletImplLocator;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] WalletImplLocator address ${walletImplLocatorAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 3: Deployed using Passport Nonce Reserver.
  // Deploy startup wallet impl (PNR)
  const startupWalletImpl = await deployContract(env, wallets, 'StartupWalletImpl', [walletImplLocatorAddress]);

  // Save to network-specific directory
  if (!fs.existsSync(stepDir)) {
    fs.mkdirSync(stepDir, { recursive: true });
  }
  fs.writeFileSync(`${stepDir}/step3.json`, JSON.stringify({
    walletImplLocatorAddress: walletImplLocatorAddress,
    startupWalletImpl: startupWalletImpl.address,
  }, null, 1));

  return env;
}

// Call primary function
step3()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
