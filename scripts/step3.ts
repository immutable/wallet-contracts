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
  const walletImplLocatorAddress = '<CHANGE_ME>';

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] WalletImplLocator address ${walletImplLocatorAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 3: Deployed using Passport Nonce Reserver.
  // Deploy startup wallet impl (PNR)
  const startupWalletImpl = await deployContract(env, wallets, 'StartupWalletImpl', [walletImplLocatorAddress]);

  fs.writeFileSync('step3.json', JSON.stringify({
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
