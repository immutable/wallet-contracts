import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContract } from '../contract';


/**
 * Step 3 - V2 Deployment
 **/
async function step3(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  const walletImplLocatorAddress = '0x09BfBa65266e35b7Aa481Ee6fddbE4bA8845C8Af';

  console.log(`[${network}] Starting V2 deployment...`);
  console.log(`[${network}] WalletImplLocator address ${walletImplLocatorAddress}`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 3: Deployed using Passport Nonce Reserver.
  // Deploy startup wallet impl (PNR)
  const startupWalletImpl = await deployContract(env, wallets, 'StartupWalletImpl', [walletImplLocatorAddress]);

  fs.writeFileSync('scripts/v2/step3.json', JSON.stringify({
    walletImplLocatorAddress: walletImplLocatorAddress,
    startupWalletImpl: startupWalletImpl.address,
  }, null, 1));

  return env;
}

// Call primary function
step3()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
