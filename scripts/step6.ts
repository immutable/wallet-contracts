import * as fs from 'fs';
import * as hre from 'hardhat';
import { Contract, ContractFactory, utils } from 'ethers';
import { newContractFactory, waitForInput } from './helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * Step 6
 **/
async function step6(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress, } = env;

  // Load addresses from previous steps
  const stepDir = network === 'base_sepolia' ? 'scripts/steps/base_sepolia' : 'scripts/steps';

  // Load step4 data for mainModuleDynamicAuth address
  const step4Path = `${stepDir}/step4.json`;
  if (!fs.existsSync(step4Path)) {
    throw new Error(`Step 4 not found at ${step4Path}. Please run step 4 first.`);
  }
  const step4Data = JSON.parse(fs.readFileSync(step4Path, 'utf8'));
  const mainModuleDynamicAuthAddress = step4Data.mainModuleDynamicAuth;

  // Load step2 data for walletImplLocator address
  const step2Path = `${stepDir}/step2.json`;
  if (!fs.existsSync(step2Path)) {
    throw new Error(`Step 2 not found at ${step2Path}. Please run step 2 first.`);
  }
  const step2Data = JSON.parse(fs.readFileSync(step2Path, 'utf8'));
  const walletImplLocatorContractAddress = step2Data.latestWalletImplLocator;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] mainModuleDynamicAuth address ${mainModuleDynamicAuthAddress}`);
  console.log(`[${network}] walletImplLocatorContract address ${walletImplLocatorContractAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWalletImplLocatorChanger().getAddress()}`
  );

  // --- Step 6: Deployed using alternate wallet
  // Set implementation address on impl locator to dynamic module auth addr
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWalletImplLocatorChanger(), 'LatestWalletImplLocator');
  const walletImplLocator: Contract = contractFactory.attach(walletImplLocatorContractAddress);
  // Adjust gas settings based on network
  const isBaseSepolia = network === 'base_sepolia';
  const isLocalhost = network === 'localhost' || network === 'hardhat';

  let gasLimit, maxFeePerGas, maxPriorityFeePerGas;

  if (isLocalhost) {
    gasLimit = 30000000;
    maxFeePerGas = 10000000000;
    maxPriorityFeePerGas = 10000000000;
  } else if (isBaseSepolia) {
    gasLimit = 20000000; // Within 25M gas limit
    maxFeePerGas = 200000000; // 0.2 gwei
    maxPriorityFeePerGas = 100000000; // 0.1 gwei
  } else {
    gasLimit = 30000000;
    maxFeePerGas = 10000000000;
    maxPriorityFeePerGas = 10000000000;
  }

  const tx = await walletImplLocator
    .connect(wallets.getWalletImplLocatorChanger())
    .changeWalletImplementation(mainModuleDynamicAuthAddress, {
      gasLimit: gasLimit,
      // Let Hardhat handle gas pricing automatically for Base Sepolia
      ...(isBaseSepolia ? {} : { maxFeePerGas, maxPriorityFeePerGas })
    });
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to: ${mainModuleDynamicAuthAddress}`);

  // Save to network-specific directory
  if (!fs.existsSync(stepDir)) {
    fs.mkdirSync(stepDir, { recursive: true });
  }
  fs.writeFileSync(`${stepDir}/step6.json`, JSON.stringify({
    mainModuleDynamicAuthAddress: mainModuleDynamicAuthAddress,
    walletImplLocatorContractAddress: walletImplLocatorContractAddress,
    signerAddress: signerAddress,
    transactionHash: tx.hash,
  }, null, 1));

  return env;
}

// Call primary function
step6()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
