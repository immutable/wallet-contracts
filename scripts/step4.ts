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
  const factoryAddress = '0x5d2F50418fB4B8a4bAd2A268Dc9DE3a5F730C4E6';
  const startupWalletImplAddress = '0x69aD23cB0697Bec37e12F4A970c3bF708f3b1231';
  const immutableSignerAddress = '0xcff469E561D9dCe5B1185CD2AC1Fa961F8fbDe61';

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Factory address ${factoryAddress}`);
  console.log(`[${network}] StartupWalletImpl address ${startupWalletImplAddress}`);
  console.log(`[${network}] ImmutableSigner address ${immutableSignerAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 4: Deployed using CREATE2 Factory.
  // Deploy main module dynamic auth (CFC)
  const mainModuleDynamicAuth = await deployContractViaCREATE2(env, wallets, 'MainModuleDynamicAuth', [factoryAddress, startupWalletImplAddress, immutableSignerAddress]);

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
