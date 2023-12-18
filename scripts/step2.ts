import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { deployContractViaCREATE2 } from './contract';
import { waitForInput } from './helper-functions';

/**
 * Step 2
 **/
async function step2(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, deployerContractAddress } = env;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] CREATE2 Factory address ${deployerContractAddress}`);

  await waitForInput();

  // Administration accounts
  // Is this correct for Mainnet?
  let walletImplLocatorAdmin = '0xb49c99a17776c10350c2be790e13d4d8dfb1c578';

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWalletImplLocatorChanger().getAddress()}`
  );

  // --- Step 2: Deployed using CREATE2 Factory
  const latestWalletImplLocator = await deployContractViaCREATE2(env, wallets, 'LatestWalletImplLocator', [
    walletImplLocatorAdmin, await wallets.getWalletImplLocatorChanger().getAddress()
  ]);

  fs.writeFileSync('step2.json', JSON.stringify({
    latestWalletImplLocator: latestWalletImplLocator.address,
  }, null, 1));

  return env;
}

// Call primary function
step2()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
