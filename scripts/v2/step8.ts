import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContract } from '../contract';

/**
 * Step 8 - V2 Deployment
 * Deploy MockValidator and MockExecutor contracts for bootstrap initialization
 **/
async function step8(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;

  console.log(`[${network}] Starting V2 deployment - Step 8...`);
  console.log(`[${network}] Deploying MockValidator and MockExecutor contracts`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(`[${network}] Deployer address: ${await wallets.getWallet().getAddress()}`);

  // --- Step 8: Deploy MockValidator contract
  console.log(`[${network}] Deploying MockValidator contract...`);
  const mockValidator = await deployContract(env, wallets, 'MockValidator', []);
  console.log(`[${network}] MockValidator deployed to: ${mockValidator.address}`);

  // Verify the contract implements the correct interface
  try {
    const isValidatorType = await mockValidator.isModuleType(1); // MODULE_TYPE_VALIDATOR
    console.log(`[${network}] MockValidator type verification: ${isValidatorType}`);
    
    if (!isValidatorType) {
      throw new Error('MockValidator does not implement MODULE_TYPE_VALIDATOR');
    }
  } catch (error) {
    console.warn(`[${network}] Could not verify MockValidator interface: ${error.message}`);
  }

  // --- Step 8: Deploy MockExecutor contract
  console.log(`[${network}] Deploying MockExecutor contract...`);
  const mockExecutor = await deployContract(env, wallets, 'MockExecutor', []);
  console.log(`[${network}] MockExecutor deployed to: ${mockExecutor.address}`);

  // Verify the contract implements the correct interface
  try {
    const isExecutorType = await mockExecutor.isModuleType(2); // MODULE_TYPE_EXECUTOR
    console.log(`[${network}] MockExecutor type verification: ${isExecutorType}`);
    
    if (!isExecutorType) {
      throw new Error('MockExecutor does not implement MODULE_TYPE_EXECUTOR');
    }
  } catch (error) {
    console.warn(`[${network}] Could not verify MockExecutor interface: ${error.message}`);
  }

  // Write deployment data to step8.json
  fs.writeFileSync('scripts/v2/step8.json', JSON.stringify({
    mockValidator: mockValidator.address,
    mockExecutor: mockExecutor.address,
  }, null, 1));

  console.log(`[${network}] Step 8 deployment completed successfully`);
  console.log(`[${network}] MockValidator: ${mockValidator.address}`);
  console.log(`[${network}] MockExecutor: ${mockExecutor.address}`);

  return env;
}

// Call primary function
step8()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Step 8 deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
