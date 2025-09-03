import * as fs from 'fs';
import * as hre from 'hardhat';
import { waitForInput } from '../helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContractViaCREATE2 } from '../contract';

/**
 * Step 4 - V2 Deployment
 **/
async function step4(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  const factoryAddress = '0x8Fa5088dF65855E0DaF87FA6591659893b24871d';
  const startupWalletImplAddress = '0x8FD900677aabcbB368e0a27566cCd0C7435F1926';
  
  // V2 specific parameters
  const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;
  const defaultValidatorAddress = '0x0000000000000000000000000000000000000000'; // address(0)
  const initData = '0x'; // empty bytes

  console.log(`[${network}] Starting V2 deployment...`);
  console.log(`[${network}] Factory address ${factoryAddress}`);
  console.log(`[${network}] StartupWalletImpl address ${startupWalletImplAddress}`);
  console.log(`[${network}] EntryPoint address ${entryPointAddress}`);
  console.log(`[${network}] DefaultValidator address ${defaultValidatorAddress}`);
  console.log(`[${network}] InitData ${initData}`);

  if (!entryPointAddress) {
    throw new Error('ENTRY_POINT_ADDRESS environment variable is required for V2 deployment');
  }

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 4: Deployed using CREATE2 Factory.
  // Deploy main module dynamic auth V2 (CFC)
  const mainModuleDynamicAuthV2 = await deployContractViaCREATE2(env, wallets, 'MainModuleDynamicAuthV2', [
    entryPointAddress,
    defaultValidatorAddress,
    initData,
    factoryAddress,
    startupWalletImplAddress
  ]);

  fs.writeFileSync('scripts/v2/step4.json', JSON.stringify({
    factoryAddress: factoryAddress,
    startupWalletImplAddress: startupWalletImplAddress,
    entryPointAddress: entryPointAddress,
    defaultValidatorAddress: defaultValidatorAddress,
    initData: initData,
    mainModuleDynamicAuthV2: mainModuleDynamicAuthV2.address,
  }, null, 1));

  return env;
}

// Call primary function
step4()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
