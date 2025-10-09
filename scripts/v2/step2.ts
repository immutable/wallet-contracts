import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContractViaCREATE2 } from '../contract';


/**
 * Step 2 - V2 Deployment
 **/
async function step2(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, deployerContractAddress } = env;
  const walletImplLocatorAdmin = process.env.WALLET_IMPL_LOCATOR_ADMIN;
  const walletImplChangerAdmin = process.env.WALLET_IMPL_CHANGER_ADMIN;

  console.log(`[${network}] Starting V2 deployment...`);
  console.log(`[${network}] CREATE2 Factory address ${deployerContractAddress}`);
  console.log(`[${network}] Wallet ImplLocator Admin address ${walletImplLocatorAdmin}`);
  console.log(`[${network}] Wallet ImplLocator Changer address ${walletImplChangerAdmin}`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  console.log(`[${network}] Cold wallet address ${await wallets.getWallet().getAddress()}`);
  console.log(`[${network}] Wallet Impl Locator Changer address ${await wallets.getWalletImplLocatorChanger().getAddress()}`);

  // --- Step 2: Deployed using CREATE2 Factory
  const latestWalletImplLocator = await deployContractViaCREATE2(env, wallets, 'LatestWalletImplLocator', [
    walletImplLocatorAdmin, walletImplChangerAdmin
  ]);

  console.log(`[${network}] Latest Wallet Impl Locator address ${latestWalletImplLocator.address}`);

  console.log(`[${network}] Writing to step2.json`);
  fs.writeFileSync('scripts/v2/step2.json', JSON.stringify({
    walletImplLocatorAdmin: walletImplLocatorAdmin,
    walletImplChangerAdmin: walletImplChangerAdmin,
    latestWalletImplLocator: latestWalletImplLocator.address,
  }, null, 1));

  console.log(`[${network}] Done`);

  return env;
}

// Call primary function
step2()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
