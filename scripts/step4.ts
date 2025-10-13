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

  // Load addresses from previous steps
  const stepDir = network === 'base_sepolia' ? 'scripts/steps/base_sepolia' : 'scripts/steps';

  // Load step1 data for factory address
  const step1Path = `${stepDir}/step1.json`;
  if (!fs.existsSync(step1Path)) {
    throw new Error(`Step 1 not found at ${step1Path}. Please run step 1 first.`);
  }
  const step1Data = JSON.parse(fs.readFileSync(step1Path, 'utf8'));
  const factoryAddress = step1Data.factory;

  // Load step3 data for startupWalletImpl address
  const step3Path = `${stepDir}/step3.json`;
  if (!fs.existsSync(step3Path)) {
    throw new Error(`Step 3 not found at ${step3Path}. Please run step 3 first.`);
  }
  const step3Data = JSON.parse(fs.readFileSync(step3Path, 'utf8'));
  const startupWalletImplAddress = step3Data.startupWalletImpl;

  // Load step0 data for deployer address
  const step0Path = `${stepDir}/step0.json`;
  if (!fs.existsSync(step0Path)) {
    throw new Error(`Step 0 not found at ${step0Path}. Please run step 0 first.`);
  }
  const step0Data = JSON.parse(fs.readFileSync(step0Path, 'utf8'));
  const deployerContractAddress = step0Data.create2DeployerAddress;

  // Load step5 data for ImmutableSigner address
  const step5Path = `${stepDir}/step5.json`;
  if (!fs.existsSync(step5Path)) {
    throw new Error(`Step 5 not found at ${step5Path}. Please run step 5 first.`);
  }
  const step5Data = JSON.parse(fs.readFileSync(step5Path, 'utf8'));
  const immutableSignerAddress = step5Data.immutableSigner;

  // Use Biconomy EntryPoint address from environment
  const entryPointAddress = process.env.BICONOMY_ENTRYPOINT_ADDRESS || '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

  // Update env with correct deployer address
  env.deployerContractAddress = deployerContractAddress;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Factory address ${factoryAddress}`);
  console.log(`[${network}] StartupWalletImpl address ${startupWalletImplAddress}`);
  console.log(`[${network}] EntryPoint address ${entryPointAddress}`);
  console.log(`[${network}] ImmutableSigner address ${immutableSignerAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- Step 4: Deployed using CREATE2 Factory.
  // Deploy main module dynamic auth (CFC)
  // Constructor parameters: (address _factory, address _startup)
  const mainModuleDynamicAuth = await deployContractViaCREATE2(env, wallets, 'MainModuleDynamicAuth', [
    factoryAddress,           // Factory address
    startupWalletImplAddress  // Startup wallet implementation
  ]);

  // Save to network-specific directory
  if (!fs.existsSync(stepDir)) {
    fs.mkdirSync(stepDir, { recursive: true });
  }
  fs.writeFileSync(`${stepDir}/step4.json`, JSON.stringify({
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
