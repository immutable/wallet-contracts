import * as fs from 'fs';
import * as hre from 'hardhat';
import { Contract, ContractFactory } from 'ethers';
import { newContractFactory, waitForInput } from './helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * Step 6
 **/
async function step6(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress, } = env;
  
  const step4Data = JSON.parse(fs.readFileSync('step4.json', 'utf-8'));
  const mainModuleDynamicAuthAddress = step4Data.mainModuleDynamicAuth;
  
  const step2Data = JSON.parse(fs.readFileSync('step2.json', 'utf-8'));
  const walletImplLocatorContractAddress = step2Data.latestWalletImplLocator;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] mainModuleDynamicAuth address ${mainModuleDynamicAuthAddress}`);
  console.log(`[${network}] walletImplLocatorContract address ${walletImplLocatorContractAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  // await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWallet().getAddress()}`
  );

  // --- Step 6: Deployed using alternate wallet
  // Set implementation address on impl locator to dynamic module auth addr
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), 'LatestWalletImplLocator');
  const walletImplLocator: Contract = contractFactory.attach(walletImplLocatorContractAddress);
  const tx = await walletImplLocator
    .connect(wallets.getWallet())
    .changeWalletImplementation(mainModuleDynamicAuthAddress, {
      gasLimit: process.env.GAS_LIMIT,
      maxFeePerGas: process.env.MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
    });
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to: ${mainModuleDynamicAuthAddress}`);

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
