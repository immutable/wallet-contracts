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
  const { network } = env;
  const walletImplLocatorAdmin = process.env.WALLET_IMPL_LOCATOR_ADMIN;
  const walletImplChangerAdmin = process.env.WALLET_IMPL_CHANGER_ADMIN;

  // Load the correct deployer address from step0.json
  const stepDir = network === 'base_sepolia' ? 'scripts/steps/base_sepolia' : 'scripts/steps';
  const step0Path = `${stepDir}/step0.json`;

  if (!fs.existsSync(step0Path)) {
    throw new Error(`Step 0 not found at ${step0Path}. Please run step 0 first.`);
  }

  const step0Data = JSON.parse(fs.readFileSync(step0Path, 'utf8'));
  const deployerContractAddress = step0Data.create2DeployerAddress;

  // Update env with correct deployer address
  env.deployerContractAddress = deployerContractAddress;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] CREATE2 Factory address ${deployerContractAddress}`);
  console.log(`[${network}] Wallet ImplLocator Admin address ${walletImplLocatorAdmin}`);
  console.log(`[${network}] Wallet ImplLocator Changer address ${walletImplChangerAdmin}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 2: Deployed using CREATE2 Factory
  const latestWalletImplLocator = await deployContractViaCREATE2(env, wallets, 'LatestWalletImplLocator', [
    walletImplLocatorAdmin, walletImplChangerAdmin
  ]);

  // Save to network-specific directory
  if (!fs.existsSync(stepDir)) {
    fs.mkdirSync(stepDir, { recursive: true });
  }
  fs.writeFileSync(`${stepDir}/step2.json`, JSON.stringify({
    walletImplLocatorAdmin: walletImplLocatorAdmin,
    walletImplChangerAdmin: walletImplChangerAdmin,
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
