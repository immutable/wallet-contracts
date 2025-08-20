import * as fs from 'fs';
import * as hre from 'hardhat';
import { waitForInput } from './helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { deployContractViaCREATE2 } from './contract';

/**
 * Step 4
 **/
async function step4(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  const factoryAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
  const startupWalletImplAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Factory address ${factoryAddress}`);
  console.log(`[${network}] StartupWalletImpl address ${startupWalletImplAddress}`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 4: Deployed using CREATE2 Factory.
  // Deploy main module dynamic auth (CFC)
  const mainModuleDynamicAuth = await deployContractViaCREATE2(env, wallets, 'MainModuleDynamicAuth', [factoryAddress, startupWalletImplAddress]);

  fs.writeFileSync('step4.json', JSON.stringify({
    factoryAddress: factoryAddress,
    startupWalletImplAddress: startupWalletImplAddress,
    mainModuleDynamicAuth: mainModuleDynamicAuth.address,
  }, null, 1));

  return env;
}

// Call primary function
step4()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
