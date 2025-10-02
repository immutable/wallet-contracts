import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContract } from '../contract';

/**
 * Step 6 - V2 Deployment.
 * Deploy NexusBootstrap contract
 **/
async function step6(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;

  console.log(`[${network}] Starting V2 deployment - Step 6...`);
  console.log(`[${network}] Deploying NexusBootstrap contract`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(`[${network}] Deployer address: ${await wallets.getWallet().getAddress()}`);

  // --- Step 6: Deploy NexusBootstrap contract.
  // NexusBootstrap doesn't require constructor parameters
  const nexusBootstrap = await deployContract(env, wallets, 'NexusBootstrap', []);

  console.log(`[${network}] NexusBootstrap deployed to: ${nexusBootstrap.address}`);

  // Write deployment data to step6.json
  fs.writeFileSync('scripts/v2/step6.json', JSON.stringify({
    nexusBootstrap: nexusBootstrap.address,
  }, null, 1));

  console.log(`[${network}] Step 6 deployment completed successfully`);

  return env;
}

// Call primary function
step6()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Step 6 deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
