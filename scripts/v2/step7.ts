import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContract } from '../contract';

/**
 * Step 7 - V2 Deployment
 * Deploy NexusBootstrap contract
 **/
async function step7(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;

  console.log(`[${network}] Starting V2 deployment - Step 7...`);
  console.log(`[${network}] Deploying NexusBootstrap contract`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(`[${network}] Deployer address: ${await wallets.getWallet().getAddress()}`);

  // --- Step 7: Deploy NexusBootstrap contract
  // NexusBootstrap doesn't require constructor parameters
  const nexusBootstrap = await deployContract(env, wallets, 'NexusBootstrap', []);

  console.log(`[${network}] NexusBootstrap deployed to: ${nexusBootstrap.address}`);

  // Write deployment data to step7.json
  fs.writeFileSync('scripts/v2/step7.json', JSON.stringify({
    nexusBootstrap: nexusBootstrap.address,
  }, null, 1));

  console.log(`[${network}] Step 7 deployment completed successfully`);

  return env;
}

// Call primary function
step7()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Step 7 deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
